import _ from 'lodash'

export class Enum {
	constructor (map) {
		let inverted = _.invert(map)
		let keys = Object.keys(map)

		this._inverted = inverted
		this._keys = keys
		this._map = map

		_.assign(this, this._inverted, this._map)
	}

	get (index) {
		return this._keys[index]
	}

	isValidKey (index) {
		return !!this.get(index)
	}

	value (index) {
    let key = this.get(index)
		return this._map[key]
	}
}

