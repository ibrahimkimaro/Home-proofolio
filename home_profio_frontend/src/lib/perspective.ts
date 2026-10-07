/**
 * Perspective mapping for the hero.
 *
 * The laptop screen in the rendered plate is a trapezoid, not a rectangle, so a plain
 * absolutely-positioned div would look pasted on. This computes the 3D transform that maps a
 * rectangle onto an arbitrary quad.
 *
 * The plate records the screen's four corners in normalised 0..1 coordinates of the photo
 * (see tools/render_hero_plate.py). We solve the projective transform taking the unit square
 * to that quad and emit it as a CSS matrix3d, so the live dashboard sits in the photographed
 * perspective.
 */

export type Quad = {
  top_l: [number, number];
  top_r: [number, number];
  bot_r: [number, number];
  bot_l: [number, number];
};

/** Coefficients [a,b,c,d,e,f,g,h] of x'=(ax+by+c)/(gx+hy+1), y'=(dx+ey+f)/(gx+hy+1). */
type Homography = [number, number, number, number, number, number, number, number];

/** Solve the square-to-unit-quad homography (the classic adjugate method). */
function squareToQuad(q: Quad): Homography {
  const [x0, y0] = q.top_l;
  const [x1, y1] = q.top_r;
  const [x2, y2] = q.bot_r;
  const [x3, y3] = q.bot_l;

  const dx1 = x1 - x2;
  const dx2 = x3 - x2;
  const dy1 = y1 - y2;
  const dy2 = y3 - y2;
  const sx = x0 - x1 + x2 - x3;
  const sy = y0 - y1 + y2 - y3;

  const den = dx1 * dy2 - dx2 * dy1;
  // Degenerate case: the quad is already a parallelogram, so the transform is affine.
  if (Math.abs(den) < 1e-12) {
    return [x1 - x0, x2 - x1, x0, y1 - y0, y2 - y1, y0, 0, 0];
  }

  const g = (sx * dy2 - dx2 * sy) / den;
  const h = (dx1 * sy - sx * dy1) / den;

  return [
    x1 - x0 + g * x1,
    x3 - x0 + h * x3,
    x0,
    y1 - y0 + g * y1,
    y3 - y0 + h * y3,
    y0,
    g,
    h,
  ];
}

/**
 * Build the CSS matrix3d that maps an element of `width × height` CSS pixels onto `quad`,
 * where the quad is expressed in normalised coordinates of a `boxW × boxH` box.
 *
 * Derivation: scale the quad into the box's pixel space, solve for H, then post-multiply by
 * the element-to-normalised diagonal (1/width, 1/height) so the matrix can be applied
 * directly to the element's own pixel coordinates.
 */
export function quadTransform(quad: Quad, width: number, height: number, boxW: number, boxH: number): string {
  const scaled: Quad = {
    top_l: [quad.top_l[0] * boxW, quad.top_l[1] * boxH],
    top_r: [quad.top_r[0] * boxW, quad.top_r[1] * boxH],
    bot_r: [quad.bot_r[0] * boxW, quad.bot_r[1] * boxH],
    bot_l: [quad.bot_l[0] * boxW, quad.bot_l[1] * boxH],
  };

  const [a, b, c, d, e, f, g, h] = squareToQuad(scaled);

  // Post-multiply by diag(1/width, 1/height, 1): the source point is in element pixels.
  const a2 = a / width;
  const b2 = b / height;
  const d2 = d / width;
  const e2 = e / height;
  const g2 = g / width;
  const h2 = h / height;

  // CSS matrix3d is column-major:
  //   | m11 m21 m31 m41 |     [ a2  b2  0  c ]
  //   | m12 m22 m32 m42 |  =  [ d2  e2  0  f ]
  //   | m13 m23 m33 m43 |     [ 0   0   1  0 ]
  //   | m14 m24 m34 m44 |     [ g2  h2  0  1 ]
  return `matrix3d(${a2},${d2},0,${g2},${b2},${e2},0,${h2},0,0,1,0,${c},${f},0,1)`;
}
