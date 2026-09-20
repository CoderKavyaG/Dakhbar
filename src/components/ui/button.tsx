import { Slot } from 'radix-ui';
import { cva, type VariantProps } from 'class-variance-authority';
import type { ComponentProps } from 'react';
const variants=cva('ui-button',{variants:{variant:{default:'ui-button-default',outline:'ui-button-outline',ghost:'ui-button-ghost'},size:{default:'ui-button-size',icon:'ui-button-icon'}},defaultVariants:{variant:'default',size:'default'}});
export function Button({asChild=false,variant,size,className='',...props}:ComponentProps<'button'>&VariantProps<typeof variants>&{asChild?:boolean}){const Comp=asChild?Slot.Root:'button';return <Comp className={variants({variant,size,className})} {...props}/>;}
