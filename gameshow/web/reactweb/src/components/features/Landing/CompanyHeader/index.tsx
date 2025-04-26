import React from 'react';
import './styles.css';

interface CompanyHeaderProps {
  companyName: string;
  tag_line_word_1: string;
  tag_line_word_2: string;
}

export const CompanyHeader: React.FC<CompanyHeaderProps> = ({ companyName, tag_line_word_1, tag_line_word_2 }) => {
  return (
    <div className="company-header">
      <h1 className="company-name">{companyName}</h1>
      <h2 className="tagline">
        <span className="tagline-part">{tag_line_word_1}</span>
        <span className="tagline-separator">, </span>
        <span className="tagline-evolved">{tag_line_word_2}</span>
        <span className="tagline-exclamation">!</span>
      </h2>
    </div>
  );
};

export default CompanyHeader;