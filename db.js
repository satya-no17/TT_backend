// import pkg, { Pool } from 'pg'
// const {POOL} = pkg
// import dotenv from 'dotenv'

// dotenv.config()

// const pool = new Pool({
//     connectionString: process.env.URL
// })

// export default pool
import pkg from 'pg'
import dotenv from 'dotenv'

dotenv.config()

const { Pool } = pkg

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false,
  },
})

export default pool
