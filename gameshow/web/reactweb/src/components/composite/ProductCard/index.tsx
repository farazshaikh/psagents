import React from 'react';
import Typography from '../../basic/Typography';
import { Button } from '../../basic/Button';
import { ProductCardContent } from '../../../content/types';
import './styles.css';

interface ProductCardProps {
  content: ProductCardContent;
}

export const ProductCard: React.FC<ProductCardProps> = ({ content }) => {
  return (
    <div className="product-card">
      <div className="product-card-header">
        <Typography
          variant="h3"
          component="span"
          className="unicode-logo"
        >
          {content.unicodeLogo}
        </Typography>
        <Typography
          variant="h1"
        >
          {content.name}
        </Typography>
      </div>

      <div className="product-card-description">
        <Typography
          variant="h2"
        >
          {content.description}
        </Typography>
      </div>

      <Button
        variant="outlined"
        color="secondary"
        href={content.ctaHref}
        className="product-card-cta"
      >
        Learn More
      </Button>
    </div>
  );
};

export default ProductCard;