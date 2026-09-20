'use client';
import { Accordion as Primitive } from 'radix-ui';
import { ChevronDown } from 'lucide-react';
import type { ReactNode } from 'react';
export function ReadingAccordion({title,children}:{title:string;children:ReactNode}){return <Primitive.Root type="single" collapsible className="reading-accordion"><Primitive.Item value="context"><Primitive.Header><Primitive.Trigger>{title}<ChevronDown size={16}/></Primitive.Trigger></Primitive.Header><Primitive.Content>{children}</Primitive.Content></Primitive.Item></Primitive.Root>;}
