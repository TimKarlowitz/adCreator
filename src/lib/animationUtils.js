/**
 * Pure function: given element animation config + current time t,
 * return animated style overrides { opacity, scaleX, scaleY }.
 * Used both in React (live preview) and during export (pure, no React state).
 */
export function getAnimationState(animation, t) {
  if (!animation || animation.type === 'none') {
    return { opacity: 1, scaleX: 1, scaleY: 1 };
  }

  const { type, startAt = 0, duration = 0.4 } = animation;
  const endAt = startAt + duration;

  // Before animation starts
  if (t < startAt) {
    if (type === 'fade-in' || type === 'scale-in') return { opacity: 0, scaleX: type === 'scale-in' ? 0.1 : 1, scaleY: type === 'scale-in' ? 0.1 : 1 };
    return { opacity: 1, scaleX: 1, scaleY: 1 };
  }

  // After animation ends
  if (t >= endAt) {
    if (type === 'fade-out') return { opacity: 0, scaleX: 1, scaleY: 1 };
    if (type === 'scale-out') return { opacity: 1, scaleX: 0.01, scaleY: 0.01 };
    return { opacity: 1, scaleX: 1, scaleY: 1 };
  }

  // During animation
  const progress = (t - startAt) / duration;
  const eased = easeInOut(progress);

  switch (type) {
    case 'fade-in':
      return { opacity: eased, scaleX: 1, scaleY: 1 };
    case 'fade-out':
      return { opacity: 1 - eased, scaleX: 1, scaleY: 1 };
    case 'scale-in':
      return { opacity: eased, scaleX: 0.1 + eased * 0.9, scaleY: 0.1 + eased * 0.9 };
    case 'scale-out':
      return { opacity: 1 - eased, scaleX: 1 - eased * 0.99, scaleY: 1 - eased * 0.99 };
    default:
      return { opacity: 1, scaleX: 1, scaleY: 1 };
  }
}

function easeInOut(t) {
  return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
}
