interface EmptyText {
  text: '';
}

export interface VarsElement {
  type: 'vars';
  value: string;
  label: string;
  children: EmptyText[];
}
