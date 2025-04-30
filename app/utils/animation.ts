export const COLORS = [
  '#ffe6a7', '#ffd598', '#ffc48a', '#ffb37c',
  '#f8ad75', '#f3a76d', '#eea065', '#e9985d',
];

export const LETTERS = 'ABCÇDEFGĞHIİJKLMNOÖPRSŞTUÜVYZ';

export const rand = (min: number, max: number) =>
  Math.random() * (max - min) + min;
  
export const randInt = (min: number, max: number) =>
  Math.floor(rand(min, max + 1)); 