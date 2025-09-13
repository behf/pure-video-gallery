import { Button } from '@/components/ui/button';

interface CategoryTabsProps {
  categories: string[];
  activeCategory: string;
  onCategoryChange: (category: string) => void;
}

const CategoryTabs = ({ categories, activeCategory, onCategoryChange }: CategoryTabsProps) => {
  return (
    <div className="flex flex-wrap gap-2 mb-8">
      {categories.map((category) => (
        <Button
          key={category}
          variant={activeCategory === category ? "default" : "secondary"}
          onClick={() => onCategoryChange(category)}
          className={`capitalize transition-all duration-200 ${
            activeCategory === category 
              ? 'bg-gradient-to-r from-primary to-accent hover:from-primary/90 hover:to-accent/90' 
              : 'hover:bg-secondary/80'
          }`}
        >
          {category}
        </Button>
      ))}
    </div>
  );
};

export default CategoryTabs;