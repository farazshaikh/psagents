import React from 'react';
import { Button } from '../../basic/Button';
import Typography from '../../basic/Typography';
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
          variant="h2"
          color="text"
        >
          {content.name}
        </Typography>
      </div>

      <div className="product-card-description">
        <Typography
          variant="h4"
          color="textSecondary"
        >
          {content.description}
        </Typography>
      </div>

      <div className="product-card-cta">
        <Button
          href={content.ctaHref}
          variant="contained"
          color="primary"
          fullWidth
          effect="gradient"
        >
          {content.ctaText}
        </Button>
      </div>
    </div>
  );
};

export default ProductCard;