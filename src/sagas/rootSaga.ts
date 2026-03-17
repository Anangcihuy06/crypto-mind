import { all, fork } from 'redux-saga/effects';
import marketSaga from './marketSaga';
import tradingSaga from './tradingSaga';
import signalSaga from './signalSaga';

export default function* rootSaga() {
  yield all([
    fork(marketSaga),
    fork(tradingSaga),
    fork(signalSaga),
  ]);
}
