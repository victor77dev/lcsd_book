import { applyMiddleware, createStore } from "redux"

import thunk from "redux-thunk"
import Reducer from "./reducers"

const middleware = applyMiddleware(thunk)

export default createStore(Reducer, middleware)
