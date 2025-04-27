import React from 'react';
import Typography from '../../../basic/Typography';
import './styles.css';

interface CompanyHeaderProps {
  companyName: string;
  tag_line_word_1: string;
  tag_line_word_2: string;
}

export const CompanyHeader: React.FC<CompanyHeaderProps> = ({ companyName, tag_line_word_1, tag_line_word_2 }) => {
  return (
    <div>
      <Typography variant="h1" align="center" className="company-name animate-fade-in">
        {companyName}
      </Typography>
      <div className="tagline">
        <Typography variant="h1" component="span" className="tagline-part">
          {tag_line_word_1}
        </Typography>
        <Typography variant="h1" component="span" className="tagline-separator">
          ,{' '}
        </Typography>
        <Typography variant="h1" component="span" className="tagline-evolved">
          {tag_line_word_2}
        </Typography>
        <Typography variant="h1" component="span" className="tagline-exclamation">
          !
        </Typography>
      </div>
    </div>
  );
};

export default CompanyHeader;