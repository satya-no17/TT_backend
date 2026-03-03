import pkg, { Pool } from 'pg'
const {POOL} = pkg
import dotenv from 'dotenv'

dotenv.config()

const pool = new Pool({
    connectionString: process.env.URL
})

export default pool