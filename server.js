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
    const today = new Date().toISOString().split("T")[0];

    const result = await pool.query(
  `SELECT * FROM daily_tasks WHERE user_id = $1`,
  [userId]
)
const dailyTasks = result.rows.map(task => ({
  ...task,
  completed: task.last_completed_date
    ? task.last_completed_date.toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' }) === today
    : false
}))
console.log(dailyTasks)
    const todos = await pool.query(
      'SELECT * FROM todos WHERE user_id = $1 ORDER BY created_at DESC',
      [userId]
    )

    const goals = await pool.query(
      'SELECT * FROM goals WHERE user_id = $1',
      [userId]
    )

    res.json({
      dailyTasks,
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


app.post('/create/goal', async (req, res) => {
  try {

    const { user_id, title, target_value, type } = req.body

    // validation
    if (!user_id || !title || !target_value || !type) {
      return res.status(400).json({ error: 'Missing fields' })
    }

    const result = await pool.query(
      `INSERT INTO goals (user_id, title, target_value, type)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [user_id, title, target_value, type]
    )

    res.status(201).json({
      message: "Goal created successfully",
      goal: result.rows[0]
    })

  } catch (error) {
    console.log(error)
    res.status(500).json({ error: 'DB error' })
  }
})



app.post('/create/daily_task', async (req, res) => {
  try {
    const { user_id, title} = req.body
    if (!user_id || !title) {
      return res.status(400).json({ error: 'Missing fields' })
    }
    await pool.query(`INSERT INTO daily_tasks (user_id, title, last_completed_date)
VALUES ($1, $2, NULL)`, [user_id, title ])
    res.status(201).json({ message: "daily task created successfully" })
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


app.delete('/users/:userId/daily_tasks/:id', async (req, res) => {
  try {
    const user_id = parseInt(req.params.userId)
    const id = parseInt(req.params.id)
    if (!id) {
      return res.status(400).json({ error: 'Missing fields' })
    }

    const result = await pool.query('DELETE FROM daily_tasks WHERE id = $1 and user_id = $2', [id, user_id])
    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'daily not found' })
    }
    res.status(200).json({ message: 'task deleted successfully' })
  } catch (error) {
    console.log(error)
    res.status(500).json({ error: 'DB error' })
  }
})



app.delete('/users/:userId/goals/:id', async (req, res) => {
  try {
    const user_id = parseInt(req.params.userId)
    const id = parseInt(req.params.id)
    if (!id) {
      return res.status(400).json({ error: 'Missing fields' })
    }

    const result = await pool.query('DELETE FROM goals WHERE id = $1 and user_id = $2', [id, user_id])
    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'goals not found' })
    }
    res.status(200).json({ message: 'goals deleted successfully' })
  } catch (error) {
    console.log(error)
    res.status(500).json({ error: 'DB error' })
  }
})


app.put('/users/:userId/todos/:id', async (req, res) => {
  try{
  const user_id = parseInt(req.params.userId)
  const id = parseInt(req.params.id)
      const { title, completed } = req.body
  if (!id) {
    return res.status(400).json({ error: 'Missing fields' })
  }
   const result = await pool.query(
      `UPDATE todos 
       SET title = $1, completed = $2 
       WHERE id = $3 AND user_id = $4`,
      [title, completed, id, user_id]
    )
  if (result.rowCount === 0) {
    return res.status(404).json({ error: 'Todo not found' })
  }
  res.status(200).json({ message: 'todo updated successfully' })
} catch (error) {
  console.log(error)
  res.status(500).json({ error: 'DB error' })
}
})


app.put('/users/:userId/daily_tasks/:id', async (req, res) => {
  try {

    const user_id = parseInt(req.params.userId)
    const id = parseInt(req.params.id)

    const { completed } = req.body
    const today = new Date().toISOString().split("T")[0];
    console.log('bodyyyyyy:::::  ',req.body)
    if (!user_id || !id) {
      return res.status(400).json({ error: "Missing params" })
    }

    const result =await pool.query(
  `UPDATE daily_tasks
   SET last_completed_date = $1
   WHERE id = $2 AND user_id = $3
   RETURNING *`,
  [completed ? today : null, id, user_id]
)

    if (result.rowCount === 0) {
      return res.status(404).json({ error: "Daily task not found" })
    }

    res.json({
      message: "Daily task updated successfully",
      task: result.rows[0]
    })

  } catch (error) {
    console.log(error)
    res.status(500).json({ error: "DB error" })
  }
})

app.put('/users/:userId/goals/:goalId', async (req, res) => {
  try {

    const user_id = parseInt(req.params.userId)
    const goal_id = parseInt(req.params.goalId)
    const { current_value } = req.body

    if (current_value === undefined) {
      return res.status(400).json({ error: 'Missing value' })
    }

    const result = await pool.query(
      `UPDATE goals
       SET current_value = $1
       WHERE id = $2 AND user_id = $3
       RETURNING *`,
      [current_value, goal_id, user_id]
    )

    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Goal not found' })
    }

    res.json({
      message: "Goal updated",
      goal: result.rows[0]
    })

  } catch (error) {
    console.log(error)
    res.status(500).json({ error: 'DB error' })
  }
})