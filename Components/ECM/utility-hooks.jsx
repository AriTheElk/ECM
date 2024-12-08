import { useEffect, useState, useMemo, useCallback } from "react";

export const useDebounce = (value, delay) => {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
};

export const useDebouceState = (initialValue, delay) => {
  const [value, setValue] = useState(initialValue);
  const debouncedValue = useDebounce(value, delay);
  return [debouncedValue, setValue];
};

export const useLocalStorage = (key, initialValue) => {
  const [value, setValue] = useState(() => {
    const storedValue = localStorage.getItem(key);
    return storedValue ? JSON.parse(storedValue) : initialValue;
  });

  useEffect(() => {
    localStorage.setItem(key, JSON.stringify(value));
  }, [key, value]);

  return [value, setValue];
};

/**
 * Returns { x, y } scroll amount of the referenced element
 * @param {Ref} ref
 * @returns {Object} { x, y }
 */
export const useScrollPosition = (ref) => {
  const [x, setX] = useState(0);
  const [y, setY] = useState(0);

  useEffect(() => {
    const handleScroll = () => {
      setX(ref.current.scrollLeft);
      setY(ref.current.scrollTop);
    };

    ref.current.addEventListener("scroll", handleScroll);
    return () => {
      ref.current.removeEventListener("scroll", handleScroll);
    };
  }, [ref]);

  return { x, y };
};

export const useScrollWidth = (ref) => {
  const [width, setWidth] = useState(0);

  useEffect(() => {
    setWidth(ref.current.scrollWidth);
  }, [ref]);

  return width;
};

export const useScrollHeight = (ref) => {
  const [height, setHeight] = useState(0);

  useEffect(() => {
    setHeight(ref.current.scrollHeight);
  }, [ref]);

  return height;
};

/**
 * Returns a boolean state of whether the referenced element is scrolled
 * in any direction
 *
 * @param {Ref} ref
 * @returns {{
 *  top: boolean,
 *  left: boolean,
 *  right: boolean,
 *  bottom: boolean
 * }}
 */
export const useIsScrolled = (ref) => {
  const { x, y } = useScrollPosition(ref);
  const { width, height } = useSize(ref);
  const scrollWidth = useScrollWidth(ref);
  const scrollHeight = useScrollHeight(ref);

  const top = useMemo(() => y > 0, [y]);
  const left = useMemo(() => x > 0, [x]);
  const right = useMemo(() => x + width < scrollWidth, [x, width, scrollWidth]);
  const bottom = useMemo(
    () => y + height < scrollHeight,
    [y, height, scrollHeight]
  );

  return { top, left, right, bottom };
};

export const useSize = (ref) => {
  const [size, setSize] = useState({
    width: ref.current ? ref.current.offsetWidth : 0,
    height: ref.current ? ref.current.offsetHeight : 0,
  });

  useEffect(() => {
    setSize({
      width: ref.current ? ref.current.offsetWidth : 0,
      height: ref.current ? ref.current.offsetHeight : 0,
    });
  }, [ref]);

  return size;
};

export const useWindowSize = () => {
  const [windowSize, setWindowSize] = useState({
    width: window.innerWidth,
    height: window.innerHeight,
  });

  useEffect(() => {
    const handleResize = () => {
      setWindowSize({
        width: window.innerWidth,
        height: window.innerHeight,
      });
    };

    window.addEventListener("resize", handleResize);
    return () => {
      window.removeEventListener("resize", handleResize);
    };
  }, []);

  return windowSize;
};

export const useToggle = (initialValue = false) => {
  const [value, setValue] = useState(initialValue);

  const toggle = useCallback(() => {
    setValue((value) => !value);
  }, []);

  return [value, toggle];
};

export const usePrevious = (value) => {
  const ref = useRef();
  useEffect(() => {
    ref.current = value;
  });
  return ref.current;
};

export const useInterval = (callback, delay) => {
  const savedCallback = useRef();
  const intervalId = useRef();

  const clear = useCallback(() => {
    clearInterval(intervalId.current);
  }, []);

  useEffect(() => {
    savedCallback.current = callback;
  }, [callback]);

  useEffect(() => {
    if (delay !== null) {
      intervalId.current = setInterval(
        () => savedCallback.current(clear),
        delay
      );
      return () => clear();
    }
  }, [delay, clear]);

  return clear;
};

export const useTimeout = (callback, delay) => {
  const savedCallback = useRef();
  const timeoutId = useRef();

  const clear = useCallback(() => {
    clearTimeout(timeoutId.current);
  }, []);

  useEffect(() => {
    savedCallback.current = callback;
  }, [callback]);

  useEffect(() => {
    if (delay !== null) {
      timeoutId.current = setTimeout(() => savedCallback.current(clear), delay);
      return () => clear();
    }
  }, [delay, clear]);

  return clear;
};

export const useFixedScrollSpeed = (ref, speed = 1) => {
  const { x, y } = useScrollPosition(ref);
  const { width, height } = useSize(ref);
  const scrollWidth = useScrollWidth(ref);
  const scrollHeight = useScrollHeight(ref);

  const handleScroll = useCallback(
    (e) => {
      const { deltaX, deltaY } = e;
      ref.current.scrollLeft = Math.max(
        0,
        Math.min(scrollWidth - width, x + deltaX * speed)
      );
      ref.current.scrollTop = Math.max(
        0,
        Math.min(scrollHeight - height, y + deltaY * speed)
      );
    },
    [ref, x, y, width, height, scrollWidth, scrollHeight, speed]
  );

  useEffect(() => {
    ref.current.addEventListener("wheel", handleScroll, { passive: false });
    return () => {
      ref.current.removeEventListener("wheel", handleScroll);
    };
  }, [ref, handleScroll]);
};
