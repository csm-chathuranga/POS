import axios from 'axios';

const TTL = 5 * 60 * 1000; // 5 minutes

let _data      = null;
let _fetchedAt = 0;
let _pending   = null;

export function getProducts() {
    if (_data && Date.now() - _fetchedAt < TTL) {
        return Promise.resolve(_data);
    }
    if (_pending) return _pending;

    _pending = axios.get('/api/products/all')
        .then(res => {
            _data      = res.data;
            _fetchedAt = Date.now();
            _pending   = null;
            return _data;
        })
        .catch(err => {
            _pending = null;
            throw err;
        });

    return _pending;
}

export function invalidateProducts() {
    _data      = null;
    _fetchedAt = 0;
    _pending   = null;
}
