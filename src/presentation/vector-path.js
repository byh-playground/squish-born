class VectorPath {
  constructor(){this.commands=[]}
  _add(name,args){this.commands.push([name,...args]);return this}
  moveTo(...args){return this._add('moveTo',args)} lineTo(...args){return this._add('lineTo',args)}
  bezierCurveTo(...args){return this._add('bezierCurveTo',args)} quadraticCurveTo(...args){return this._add('quadraticCurveTo',args)}
  closePath(){return this._add('closePath',[])} rect(...args){return this._add('rect',args)}
  arc(...args){return this._add('arc',args)} ellipse(...args){return this._add('ellipse',args)}
  addPath(other){if(other instanceof VectorPath)this.commands.push(...other.commands.map(command=>[...command]));return this}
  replay(target){for(const [name,...args] of this.commands)target[name](...args)}
}
const Path2D = VectorPath;
function inverseAffineTransform(m){const det=m.a*m.d-m.b*m.c;if(!Number.isFinite(det)||Math.abs(det)<1e-12)return null;return [m.d/det,-m.b/det,-m.c/det,m.a/det,(m.c*m.f-m.d*m.e)/det,(m.b*m.e-m.a*m.f)/det]}
function flattenTransformedClip(context){
 const contours=context.vector?.path?.filter(path=>path.length>=3);if(!Array.isArray(contours)||contours.length!==1||contours[0].length>256)return null;
 const inverse=inverseAffineTransform(context.getTransform());if(!inverse)return null;
 const out=[];for(const p of contours[0]){const x=inverse[0]*p.x+inverse[2]*p.y+inverse[4],y=inverse[1]*p.x+inverse[3]*p.y+inverse[5];if(!Number.isFinite(x)||!Number.isFinite(y))return null;const n=out.length;if(n<2||Math.abs(out[n-2]-x)>1e-8||Math.abs(out[n-1]-y)>1e-8)out.push(x,y)}
 if(out.length>=4&&Math.abs(out[0]-out.at(-2))<1e-8&&Math.abs(out[1]-out.at(-1))<1e-8)out.splice(-2,2);
 return out.length>=6?Float32Array.from(out):null;
}


export { VectorPath, Path2D, inverseAffineTransform, flattenTransformedClip };
