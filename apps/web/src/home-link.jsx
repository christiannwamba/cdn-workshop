import React, { useSyncExternalStore } from 'react';
import { homeChange, homeHref } from './home-navigation.js';

function subscribe(update) {
  window.addEventListener('hashchange', update);
  window.addEventListener(homeChange, update);
  return () => {
    window.removeEventListener('hashchange', update);
    window.removeEventListener(homeChange, update);
  };
}
export function HomeLink(props) {
  const href = useSyncExternalStore(subscribe, homeHref);
  return <a {...props} href={href} />;
}
