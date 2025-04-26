import React from 'react';

const Button: React.FC = () => {
  const unusedVariable = "This will cause a lint error";  // Introducing lint error
  return (
    <button>
      {invalidVariable}  // This will cause an error since invalidVariable is not defined
    </button>
  );
};

export default Button; 