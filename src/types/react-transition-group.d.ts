declare module 'react-transition-group' {
  import * as React from 'react';

  export interface CSSTransitionProps {
    in?: boolean;
    timeout: number | { appear?: number; enter?: number; exit?: number };
    classNames:
      | string
      | {
          appear?: string;
          appearActive?: string;
          enter?: string;
          enterActive?: string;
          exit?: string;
          exitActive?: string;
        };
    appear?: boolean;
    mountOnEnter?: boolean;
    unmountOnExit?: boolean;
    nodeRef?: React.RefObject<Element>;
    onEnter?: (node: Element, isAppearing: boolean) => void;
    onEntered?: (node: Element, isAppearing: boolean) => void;
    onExit?: (node: Element) => void;
    onExited?: (node: Element) => void;
  }

  export const CSSTransition: React.FC<React.PropsWithChildren<CSSTransitionProps>>;

  export interface TransitionGroupProps {
    component?: React.ElementType | null;
  }

  export const TransitionGroup: React.FC<React.PropsWithChildren<TransitionGroupProps>>;
}
