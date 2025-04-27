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
  } as React.CSSProperties;

  return (
    <section id={content.id} className="products-section" style={sectionStyle}>
      <div className="products-section-content">
        <Typography
          variant="h1"
          align="center"
          gutterBottom
        >
          {content.header}
        </Typography>

        <Typography
          variant="h3"
          align="center"
          gutterBottom
          className="products-subheader"
        >
          {content.subHeader}
        </Typography>

        <Typography
          variant="h4"
          color="primary"
          align="center"
          className="products-category"
        >
          {content.categoryTerm}
        </Typography>

        <div className="products-grid">
          {content.products.map((product, index) => (
            <ProductCard key={index} content={product} />
          ))}
        </div>

        <Typography
          variant="subtitle1"
          align="center"
          className="products-closing"
        >
          {content.closingLine}
        </Typography>
      </div>
    </section>
  );
};

export default ProductsSection;