import React from 'react';
import { useTheme } from '../../../basic/ThemeProvider';
import Typography from '../../../basic/Typography';
import ProductCard from '../../../composite/ProductCard';
import { ProductsSectionContent } from '../../../../content/types';
import './styles.css';

interface ProductsSectionProps {
  content: ProductsSectionContent;
}

const ProductsSection: React.FC<ProductsSectionProps> = ({ content }) => {
  const { theme } = useTheme();

  const sectionStyle = {
    backgroundColor: theme.colors.bg.primary,
    '--glow-color': theme.colors.accent.primary,
    '--text-gradient-start': theme.colors.fg.primary,
    '--text-gradient-end': theme.colors.fg.secondary,
  } as React.CSSProperties;

  return (
    <section id={content.id} className="products-section" style={sectionStyle}>
      <div className="products-section-glow" />
      <div className="products-section-content">
        <Typography
          variant="h2"
          className="products-header"
          component="h2"
        >
          {content.header}
        </Typography>

        <Typography
          variant="h3"
          className="products-subheader"
          component="h3"
        >
          {content.subHeader}
        </Typography>

        <Typography
          variant="h4"
          className="products-category"
          component="h4"
        >
          {content.categoryTerm}
        </Typography>

        <div className="products-grid">
          {content.products.map((product, index) => (
            <ProductCard key={index} content={product} />
          ))}
        </div>

        <Typography
          variant="body1"
          className="products-closing"
        >
          {content.closingLine}
        </Typography>
      </div>
    </section>
  );
};

export default ProductsSection; 