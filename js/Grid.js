var Grid = function(bottom, x, y, z){
	this._x=x;
	this._y=y;
	this._z=z;
	this.g=[[[[null]*z]*y]*x];
}

Grid.prototype.get(x, y, z){
	return this.g[x][y][z];
}

Grid.prototype.diff(grid2){
	if (this._x!=grid2._x)||(this._y!=grid2._y)||(this._x!=grid2._z){
		console.log("GridDelta called with grids that are not the same size.");
	}
	// Returns a list of (x,y,z) triplets where this and grid2 differ
	ret=[];
	for (i=0; i<this._x; i++){
		for (j=0; j<this._y; j++){
			for (k=0; k<this._z; k++){
				if (this.get(i,j,k))!=(grid2.get(i,j,k)){
					ret.push((i,j,k));
				}
			}
		}
	}
	return ret;
}