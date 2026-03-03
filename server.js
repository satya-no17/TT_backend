import express from "express"
import cors from "cors"
import dotenv from 'dotenv'
import pool from "./db.js"
import bcrypt from 'bcrypt'

dotenv.config()
const app = express();
const PORT = process.env.PORT;
app.use(cors())
app.use(express.json())
app.get('/', (req, res) => {
  res.send("tt back")
})
app.listen(PORT, () => {
  console.log(`server is running on ${PORT}`)
})
app.get('/test-db', async (req, res) => {
  try {
    const result = await pool.query('SELECT NOW()')
    res.json(result.rows[0])
  } catch (err) {
    console.error('DB ERROR 👉', err)
    res.status(500).json({ error: err.message })
  }
})
app.post('/register', async (req, res) => {
  try {
    const { username, hashpass } = req.body
    // checking if the users and details are correct...
    if (!username || !hashpass) {
      return res.status(400).json({ error: "user and password is required" })
    }
    //hashing and query 
    let passhash = await bcrypt.hash(hashpass, 5)
    const result = await pool.query("insert into users (username,password_hash) values ($1,$2) returning id", [username, passhash])


    // send response
    res.status(201).json({
      message: 'User registered successfully',
      userId: result.rows[0].id
    })
  } catch (err) {

    // unique username error
    if (err.code === '23505') {
      return res.status(400).json({ error: 'username already exists' })
    }
    console.error('DB ERROR 👉', err)
    res.status(500).json({ error: err.message })
  }
})
app.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body
    // checking if the users and details are correct...
    if (!username || !password) {
      return res.status(400).json({ error: "user and password is required" })
    }


    const data = await pool.query('SELECT * FROM users WHERE username = $1 ', [username])
    if (data.rows.length === 0) {
      return res.status(400).json({ erorr: 'user dont exist' })
    }

    const user = data.rows[0]
    const isValid = await bcrypt.compare(password, user.password_hash)
    if (!isValid) {
      return res.status(400).json({ error: "invalid credentials" })

    }
    res.json({
      message: 'login successful',
      user: {
        id: user.id,
        username: user.username
      }
    })
  } catch (err) {
    return res.status(400).json({ error: err })
  }
})

app.get('/users/:userId/dashboard', async (req, res) => {
  const { userId } = req.params

  try {
    const dailyTasks = await pool.query(
      'SELECT * FROM daily_tasks WHERE user_id = $1 ORDER BY date DESC',
      [userId]
    )

    const todos = await pool.query(
      'SELECT * FROM todos WHERE user_id = $1 ORDER BY created_at DESC',
      [userId]
    )

    const goals = await pool.query(
      'SELECT * FROM goals WHERE user_id = $1',
      [userId]
    )

    res.json({
      dailyTasks: dailyTasks.rows,
      todos: todos.rows,
      goals: goals.rows
    })

  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'server error' })
  }
})
app.post('/create/todo', async (req, res) => {
  try {
    const { user_id, title, completed } = req.body
    if (!user_id || !title) {
      return res.status(400).json({ error: 'Missing fields' })
    }
    await pool.query(`insert into todos(user_id , title ,completed) values ($1,$2,$3)`, [user_id, title, completed ?? false])
    res.status(201).json({ message: "todo created successfully" })
  } catch (error) {
    console.log(error)
    res.status(500).json({ error: 'DB error' })

  }
})

app.delete('/users/:userId/todos/:id', async (req, res) => {
  try {
    const user_id = parseInt(req.params.userId)
    const id = parseInt(req.params.id)
    if (!id) {
      return res.status(400).json({ error: 'Missing fields' })
    }

    const result = await pool.query('DELETE FROM todos WHERE id = $1 and user_id = $2', [id, user_id])
    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Todo not found' })
    }
    res.status(200).json({ message: 'todo deleted successfully' })
  } catch (error) {
    console.log(error)
    res.status(500).json({ error: 'DB error' })
  }
})

app.post('/users/:userId/todos/:id', async (req, res) => {
  try{
  const user_id = parseInt(req.params.userId)
  const id = parseInt(req.params.id)
  if (!id) {
    return res.status(400).json({ error: 'Missing fields' })
  }
  const result = await pool.query('')
  if (result.rowCount === 0) {
    return res.status(404).json({ error: 'Todo not found' })
  }
  res.status(200).json({ message: 'todo updated successfully' })
} catch (error) {
  console.log(error)
  res.status(500).json({ error: 'DB error' })
}
})