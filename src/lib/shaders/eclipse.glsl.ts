// Angular disc overlap gives continuous umbra/penumbra, including annularity.
export const eclipseGLSL = /* glsl */ `
  uniform vec3 uOccluderPosition;
  uniform float uOccluderRadius;
  uniform float uSunRadius;
  float eclipseTransmission() {
    if (uOccluderRadius <= 0.0) return 1.0;
    vec3 sun = uSunPosition - vPosition;
    vec3 occ = uOccluderPosition - vPosition;
    float ds = length(sun), dO = length(occ);
    if (dO >= ds || dot(sun, occ) <= 0.0) return 1.0;
    float a = asin(clamp(uSunRadius / ds, 0.0, 1.0));
    float b = asin(clamp(uOccluderRadius / dO, 0.0, 1.0));
    float d = acos(clamp(dot(normalize(sun), normalize(occ)), -1.0, 1.0));
    if (d >= a + b) return 1.0;
    if (d <= abs(a - b)) return 1.0 - min(1.0, b*b/(a*a));
    float x = acos(clamp((d*d+a*a-b*b)/(2.0*d*a), -1.0, 1.0));
    float y = acos(clamp((d*d+b*b-a*a)/(2.0*d*b), -1.0, 1.0));
    float area = a*a*x + b*b*y - 0.5*sqrt(max(0.0, (-d+a+b)*(d+a-b)*(d-a+b)*(d+a+b)));
    return clamp(1.0-area/(3.14159265*a*a), 0.0, 1.0);
  }
`;
