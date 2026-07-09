'use client';
import React from 'react';
import { motion, Variants } from 'framer-motion';

interface AnimatedGroupVariants {
  container?: Variants;
  item?: Variants;
}

interface AnimatedGroupProps {
  variants?: AnimatedGroupVariants;
  children?: React.ReactNode;
  className?: string;
}

const defaultContainerVariants: Variants = {
  hidden: {},
  visible: {
    transition: {
      staggerChildren: 0.1,
    },
  },
};

const defaultItemVariants: Variants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 },
};

const AnimatedGroup: React.FC<AnimatedGroupProps> = ({
  variants,
  children,
  className,
}) => {
  const containerVariants = variants?.container ?? defaultContainerVariants;
  const itemVariants = variants?.item ?? defaultItemVariants;

  return (
    <motion.div
      initial="hidden"
      animate="visible"
      variants={containerVariants}
      className={className}
    >
      {React.Children.map(children, (child, index) => (
        <motion.div key={index} variants={itemVariants}>
          {child}
        </motion.div>
      ))}
    </motion.div>
  );
};

export { AnimatedGroup };
