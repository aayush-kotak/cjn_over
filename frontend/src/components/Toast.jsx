import { useState, useEffect } from 'react';

let toastId = 0;
let listeners = [];

export function showToast(message, type = 'success') {
  const id = ++toastId;
  listeners.forEach(fn => fn({ id, message, type }));
  return id;
}

export default function Toast() {
  const [toasts, setToasts] = useState([]);

  useEffect(() => {
    const listener = (toast) => {
      setToasts(prev => [...prev, { ...toast, exiting: false }]);

      // Auto dismiss after 3 seconds
      setTimeout(() => {
        setToasts(prev => prev.map(t => t.id === toast.id ? { ...t, exiting: true } : t));
        setTimeout(() => {
          setToasts(prev => prev.filter(t => t.id !== toast.id));
        }, 350);
      }, 3000);
    };
    listeners.push(listener);
    return () => {
      listeners = listeners.filter(l => l !== listener);
    };
  }, []);

  if (toasts.length === 0) return null;

  return (
    <div className="fixed top-20 right-4 z-[100] flex flex-col gap-2 max-w-sm w-full">
      {toasts.map(toast => (
        <div
          key={toast.id}
          className={`${toast.exiting ? 'toast-exit' : 'toast-enter'} 
            ${toast.type === 'success'
              ? 'bg-gradient-to-r from-primary to-primary-light border-primary/30'
              : 'bg-gradient-to-r from-red-600 to-red-500 border-red-400/30'
            }
            text-white px-5 py-4 rounded-xl shadow-2xl border flex items-start gap-3 backdrop-blur-sm`}
        >
          <span className="text-xl flex-shrink-0 mt-0.5">
            {toast.type === 'success' ? '✅' : '❌'}
          </span>
          <p className="text-sm font-semibold leading-snug">{toast.message}</p>
        </div>
      ))}
    </div>
  );
}
