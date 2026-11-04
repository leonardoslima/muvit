import React, { type ReactNode } from 'react';

type SvgHostProps = { children?: ReactNode; [key: string]: unknown };

function svgHost(name: string) {
  return React.forwardRef<unknown, SvgHostProps>(function SvgHost(props, ref) {
    return React.createElement(name, { ...props, ref }, props.children as ReactNode);
  });
}

export const Svg = svgHost('Svg');
export const Path = svgHost('Path');
export const Circle = svgHost('Circle');
export const Ellipse = svgHost('Ellipse');
export const Line = svgHost('Line');
export const Polygon = svgHost('Polygon');
export const Polyline = svgHost('Polyline');
export const Rect = svgHost('Rect');
export const G = svgHost('G');
export default Svg;
