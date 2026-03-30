// PlayNoPause - Main World Injector
// 在 document_start 时运行于 MAIN world
// 立即安装拦截钩子，但受开关控制

(function() {
  'use strict';
  
  // 防止重复注入
  if (window.__playNoPauseInjected) return;
  window.__playNoPauseInjected = true;
  
  // 拦截是否激活
  let isActive = false;
  
  // 保存原始方法引用
  const originalAddEventListener = EventTarget.prototype.addEventListener;
  const originalRemoveEventListener = EventTarget.prototype.removeEventListener;
  const originalDispatchEvent = EventTarget.prototype.dispatchEvent;
  const originalHasFocus = Document.prototype.hasFocus;
  
  // 获取原始属性描述符
  const visibilityDescriptor = Object.getOwnPropertyDescriptor(Document.prototype, 'visibilityState') ||
                                Object.getOwnPropertyDescriptor(document, 'visibilityState');
  const hiddenDescriptor = Object.getOwnPropertyDescriptor(Document.prototype, 'hidden') ||
                            Object.getOwnPropertyDescriptor(document, 'hidden');
  const webkitVisibilityDescriptor = Object.getOwnPropertyDescriptor(Document.prototype, 'webkitVisibilityState');
  const webkitHiddenDescriptor = Object.getOwnPropertyDescriptor(Document.prototype, 'webkitHidden');
  
  // 存储被拦截的 visibilitychange 监听器
  const interceptedListeners = new WeakMap();
  
  // 重写 EventTarget.prototype.addEventListener
  EventTarget.prototype.addEventListener = function(type, listener, options) {
    if (isActive && type === 'visibilitychange') {
      // 存储监听器但不注册
      if (!interceptedListeners.has(this)) {
        interceptedListeners.set(this, []);
      }
      interceptedListeners.get(this).push({ listener, options });
      console.log('[PlayNoPause] 已拦截 visibilitychange 监听器');
      return;
    }
    return originalAddEventListener.call(this, type, listener, options);
  };
  
  // 重写 EventTarget.prototype.removeEventListener
  EventTarget.prototype.removeEventListener = function(type, listener, options) {
    if (isActive && type === 'visibilitychange') {
      // 从拦截列表中移除
      const listeners = interceptedListeners.get(this);
      if (listeners) {
        const index = listeners.findIndex(item => item.listener === listener);
        if (index !== -1) {
          listeners.splice(index, 1);
        }
      }
      return;
    }
    return originalRemoveEventListener.call(this, type, listener, options);
  };
  
  // 重写 EventTarget.prototype.dispatchEvent
  EventTarget.prototype.dispatchEvent = function(event) {
    if (isActive && event && event.type === 'visibilitychange') {
      console.log('[PlayNoPause] 已阻止 visibilitychange 事件派发');
      return true;
    }
    return originalDispatchEvent.call(this, event);
  };
  
  // 重写 document.visibilityState
  Object.defineProperty(Document.prototype, 'visibilityState', {
    get: function() {
      if (isActive) return 'visible';
      return visibilityDescriptor ? visibilityDescriptor.get.call(this) : 'visible';
    },
    configurable: true
  });
  
  // 重写 document.hidden
  Object.defineProperty(Document.prototype, 'hidden', {
    get: function() {
      if (isActive) return false;
      return hiddenDescriptor ? hiddenDescriptor.get.call(this) : false;
    },
    configurable: true
  });
  
  // 重写 document.hasFocus()
  Document.prototype.hasFocus = function() {
    if (isActive) return true;
    return originalHasFocus.call(this);
  };
  
  // 重写 webkit 前缀属性（兼容旧浏览器）
  if (webkitVisibilityDescriptor) {
    Object.defineProperty(Document.prototype, 'webkitVisibilityState', {
      get: function() {
        if (isActive) return 'visible';
        return webkitVisibilityDescriptor.get.call(this);
      },
      configurable: true
    });
  }
  
  if (webkitHiddenDescriptor) {
    Object.defineProperty(Document.prototype, 'webkitHidden', {
      get: function() {
        if (isActive) return false;
        return webkitHiddenDescriptor.get.call(this);
      },
      configurable: true
    });
  }
  
  // 拦截 onvisibilitychange 属性
  let _onvisibilitychange = null;
  Object.defineProperty(document, 'onvisibilitychange', {
    get: function() {
      return isActive ? null : _onvisibilitychange;
    },
    set: function(val) {
      if (isActive) {
        console.log('[PlayNoPause] 已拦截 onvisibilitychange 属性设置');
        return;
      }
      _onvisibilitychange = val;
    },
    configurable: true
  });
  
  // 监听来自 bridge.js (ISOLATED world) 的激活/停用消息
  window.addEventListener('message', function(event) {
    // 只接受来自同一窗口的消息
    if (event.source !== window) return;
    
    if (event.data && event.data.type === 'PLAY_NO_PAUSE_TOGGLE') {
      const wasActive = isActive;
      isActive = event.data.active;
      
      if (isActive && !wasActive) {
        console.log('[PlayNoPause] 可见性检测拦截已启用');
      } else if (!isActive && wasActive) {
        console.log('[PlayNoPause] 可见性检测拦截已禁用');
      }
    }
  });
  
  console.log('[PlayNoPause] 拦截钩子已安装，等待激活...');
})();
