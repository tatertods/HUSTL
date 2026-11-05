import React, { useState, useEffect, useLayoutEffect, useRef, useMemo, useCallback, memo, Fragment } from 'react';

export { React, useState, useEffect, useLayoutEffect, useRef, useMemo, useCallback, memo, Fragment };
export const h = React.createElement;
export const clamp = (value, min, max) => Math.min(Math.max(value, min), max);
export const prefersReducedMotion = () =>
  !!(typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
