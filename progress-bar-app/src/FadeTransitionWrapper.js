import React, { useEffect, useState } from 'react';

const FadeTransitionWrapper = ({ children }) => {
  const [fade, setFade] = useState('fade-enter');

  useEffect(() => {
    setFade('fade-enter fade-enter-active');

    return () => {
      setFade('fade-exit fade-exit-active');
    };
  }, []);

  return <div className={fade}>{children}</div>;
};

export default FadeTransitionWrapper;
