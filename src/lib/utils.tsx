import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import {
  Utensils,
  Car,
  Ticket,
  Bolt,
  Home,
  HeartPulse,
  ShoppingBag,
  Plane,
  Book,
  User,
  MoreHorizontal,
  type LucideProps,
} from 'lucide-react';
import React from "react";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export const getCategoryIcon = (category: string, props?: LucideProps) => {
  const iconProps = { className: 'h-4 w-4 text-muted-foreground', ...props };
  switch (category) {
    case 'Food':
      return <Utensils {...iconProps} />;
    case 'Transportation':
      return <Car {...iconProps} />;
    case 'Entertainment':
      return <Ticket {...iconProps} />;
    case 'Utilities':
      return <Bolt {...iconProps} />;
    case 'Housing':
      return <Home {...iconProps} />;
    case 'Healthcare':
      return <HeartPulse {...iconProps} />;
    case 'Shopping':
      return <ShoppingBag {...iconProps} />;
    case 'Travel':
      return <Plane {...iconProps} />;
    case 'Education':
      return <Book {...iconProps} />;
    case 'Personal':
      return <User {...iconProps} />;
    default:
      return <MoreHorizontal {...iconProps} />;
  }
};
