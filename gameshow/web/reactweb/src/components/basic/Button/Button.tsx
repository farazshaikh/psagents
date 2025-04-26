import React from 'react';

const Button: React.FC = () => {
  const unusedVariable = "This will cause a lint error";  // Introducing lint error
  return (
    <button>
      Click me
    </button>
  );
};

export default Button; 