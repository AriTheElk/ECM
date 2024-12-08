import React, { useRef } from "react";
import { useIsScrolled, useScrollPosition, useSize } from "./utility-hooks";

const GRADIENT_WIDTH = 64;
const GRADIENT_BUFFER = 16;

const navigationContainer = {
  position: "relative",
  overflow: "auto",
  width: "100%",
  height: "auto",
  overscrollBehavior: "contain",
};

const navigationContainerLeftGradient = {
  position: "absolute",
  top: 0,
  left: 0,
  width: GRADIENT_WIDTH,
  height: "100%",
  background:
    "linear-gradient(-90deg, rgba(255, 255, 255, 0) 0%, var(--background-primary) 65%)",
  pointerEvents: "none",
  zIndex: 1,
};

const navigationContainerRightGradient = {
  position: "absolute",
  top: 0,
  right: 0,
  width: GRADIENT_WIDTH,
  height: "100%",
  background:
    "linear-gradient(90deg, rgba(255, 255, 255, 0) 0%, var(--background-primary) 35%)",
  pointerEvents: "none",
  zIndex: 1,
};

const navigationContainerTopGradient = {
  position: "absolute",
  top: 0,
  left: 0,
  width: "100%",
  height: GRADIENT_WIDTH,
  background:
    "linear-gradient(0deg, rgba(255, 255, 255, 0) 0%, var(--background-primary) 65%)",
  pointerEvents: "none",
  zIndex: 1,
};

const navigationContainerBottomGradient = {
  position: "absolute",
  bottom: 0,
  left: 0,
  width: "100%",
  height: GRADIENT_WIDTH,
  background:
    "linear-gradient(180deg, rgba(255, 255, 255, 0) 0%, var(--background-primary) 35%)",
  pointerEvents: "none",
  zIndex: 1,
};

export const ScrollView = ({ children, style }) => {
  const navRef = useRef(null);
  const { width, height } = useSize(navRef);
  const { x, y } = useScrollPosition(navRef);
  const { left, right, bottom, top } = useIsScrolled(navRef);

  return (
    <nav style={{ ...navigationContainer, ...style }} ref={navRef}>
      {left && (
        <div
          style={{
            ...navigationContainerLeftGradient,
            left: x - GRADIENT_BUFFER,
          }}
        />
      )}
      {right && (
        <div
          style={{
            ...navigationContainerRightGradient,
            left: Math.max(width + x - 48 + GRADIENT_BUFFER, width - 48),
          }}
        />
      )}

      {top && (
        <div
          style={{
            ...navigationContainerTopGradient,
            top: y - GRADIENT_BUFFER,
          }}
        />
      )}

      {bottom && (
        <div
          style={{
            ...navigationContainerBottomGradient,
            top: Math.max(height + y - 48 + GRADIENT_BUFFER, height - 48),
          }}
        />
      )}

      {children}
    </nav>
  );
};
