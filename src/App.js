import React, { useState, useEffect } from 'react';

function App() {
  const [todos, setTodos] = useState([]);
  const [newTodo, setNewTodo] = useState('');
  const [filter, setFilter] = useState('all'); // 'all', 'active', 'completed'

  // Load todos from localStorage on component mount
  useEffect(() => {
    const savedTodos = localStorage.getItem('todos');
    if (savedTodos) {
      setTodos(JSON.parse(savedTodos));
    }
  }, []);

  // Save todos to localStorage whenever todos change
  useEffect(() => {
    localStorage.setItem('todos', JSON.stringify(todos));
  }, [todos]);

  // Add a new todo
  const addTodo = () => {
    if (newTodo.trim() !== '') {
      const todo = {
        id: Date.now(),
        text: newTodo.trim(),
        completed: false,
        createdAt: new Date().toISOString()
      };
      setTodos([...todos, todo]);
      setNewTodo('');
    }
  };

  // Toggle todo completion status
  const toggleTodo = (id) => {
    setTodos(todos.map(todo =>
      todo.id === id ? { ...todo, completed: !todo.completed } : todo
    ));
  };

  // Delete a todo
  const deleteTodo = (id) => {
    setTodos(todos.filter(todo => todo.id !== id));
  };

  // Edit a todo
  const editTodo = (id, newText) => {
    if (newText.trim() !== '') {
      setTodos(todos.map(todo =>
        todo.id === id ? { ...todo, text: newText.trim() } : todo
      ));
    }
  };

  // Clear completed todos
  const clearCompleted = () => {
    setTodos(todos.filter(todo => !todo.completed));
  };

  // Mark all todos as completed
  const markAllCompleted = () => {
    setTodos(todos.map(todo => ({ ...todo, completed: true })));
  };

  // Filter todos based on current filter
  const filteredTodos = todos.filter(todo => {
    switch (filter) {
      case 'active':
        return !todo.completed;
      case 'completed':
        return todo.completed;
      default:
        return true;
    }
  });

  // Count statistics
  const totalTodos = todos.length;
  const completedTodos = todos.filter(todo => todo.completed).length;
  const activeTodos = totalTodos - completedTodos;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <header className="text-center mb-12">
            <h1 className="text-5xl font-bold text-gray-800 mb-4">
              Todo List
            </h1>
            <p className="text-xl text-gray-600">
              A beautiful todo list app created by AI
            </p>
          </header>

          <main className="bg-white rounded-2xl shadow-xl p-8">
            {/* Add Todo Section */}
            <div className="mb-8">
              <div className="flex gap-3 mb-4">
                <input
                  type="text"
                  value={newTodo}
                  onChange={(e) => setNewTodo(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && addTodo()}
                  placeholder="What needs to be done?"
                  className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <button
                  onClick={addTodo}
                  className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-6 rounded-lg transition duration-200"
                >
                  Add Todo
                </button>
              </div>
              
              {/* Bulk Actions */}
              {todos.length > 0 && (
                <div className="flex gap-2 mb-4">
                  <button
                    onClick={markAllCompleted}
                    className="bg-green-600 hover:bg-green-700 text-white font-medium py-2 px-4 rounded-lg transition duration-200 text-sm"
                  >
                    Mark All Complete
                  </button>
                  <button
                    onClick={clearCompleted}
                    className="bg-red-600 hover:bg-red-700 text-white font-medium py-2 px-4 rounded-lg transition duration-200 text-sm"
                  >
                    Clear Completed
                  </button>
                </div>
              )}
            </div>

            {/* Statistics */}
            {todos.length > 0 && (
              <div className="grid grid-cols-3 gap-4 mb-6">
                <div className="bg-blue-50 p-4 rounded-lg text-center">
                  <div className="text-2xl font-bold text-blue-600">{totalTodos}</div>
                  <div className="text-sm text-gray-600">Total</div>
                </div>
                <div className="bg-yellow-50 p-4 rounded-lg text-center">
                  <div className="text-2xl font-bold text-yellow-600">{activeTodos}</div>
                  <div className="text-sm text-gray-600">Active</div>
                </div>
                <div className="bg-green-50 p-4 rounded-lg text-center">
                  <div className="text-2xl font-bold text-green-600">{completedTodos}</div>
                  <div className="text-sm text-gray-600">Completed</div>
                </div>
              </div>
            )}

            {/* Filter Buttons */}
            {todos.length > 0 && (
              <div className="flex gap-2 mb-6 justify-center">
                <button
                  onClick={() => setFilter('all')}
                  className={`px-4 py-2 rounded-lg transition duration-200 ${
                    filter === 'all'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                  }`}
                >
                  All
                </button>
                <button
                  onClick={() => setFilter('active')}
                  className={`px-4 py-2 rounded-lg transition duration-200 ${
                    filter === 'active'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                  }`}
                >
                  Active
                </button>
                <button
                  onClick={() => setFilter('completed')}
                  className={`px-4 py-2 rounded-lg transition duration-200 ${
                    filter === 'completed'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                  }`}
                >
                  Completed
                </button>
              </div>
            )}

            {/* Todo List */}
            <div className="space-y-3">
              {filteredTodos.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  {todos.length === 0 ? (
                    <div>
                      <div className="text-6xl mb-4">📝</div>
                      <p className="text-xl">No todos yet!</p>
                      <p className="text-sm">Add your first todo above to get started.</p>
                    </div>
                  ) : (
                    <div>
                      <div className="text-6xl mb-4">✅</div>
                      <p className="text-xl">No {filter} todos!</p>
                      <p className="text-sm">Try a different filter or add more todos.</p>
                    </div>
                  )}
                </div>
              ) : (
                filteredTodos.map(todo => (
                  <TodoItem
                    key={todo.id}
                    todo={todo}
                    onToggle={toggleTodo}
                    onDelete={deleteTodo}
                    onEdit={editTodo}
                  />
                ))
              )}
            </div>
          </main>

          <footer className="text-center mt-12 text-gray-500">
            <p>Created with ❤️ by AI Assistant</p>
          </footer>
        </div>
      </div>
    </div>
  );
}

// Todo Item Component
function TodoItem({ todo, onToggle, onDelete, onEdit }) {
  const [isEditing, setIsEditing] = useState(false);
  const [editText, setEditText] = useState(todo.text);

  const handleEdit = () => {
    if (isEditing) {
      onEdit(todo.id, editText);
      setIsEditing(false);
    } else {
      setEditText(todo.text);
      setIsEditing(true);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      handleEdit();
    } else if (e.key === 'Escape') {
      setIsEditing(false);
      setEditText(todo.text);
    }
  };

  return (
    <div className={`flex items-center gap-3 p-4 rounded-lg border transition duration-200 ${
      todo.completed 
        ? 'bg-gray-50 border-gray-200' 
        : 'bg-white border-gray-300 hover:border-blue-300'
    }`}>
      {/* Checkbox */}
      <button
        onClick={() => onToggle(todo.id)}
        className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition duration-200 ${
          todo.completed
            ? 'bg-green-500 border-green-500 text-white'
            : 'border-gray-300 hover:border-green-500'
        }`}
      >
        {todo.completed && <span className="text-sm">✓</span>}
      </button>

      {/* Todo Text */}
      <div className="flex-1">
        {isEditing ? (
          <input
            type="text"
            value={editText}
            onChange={(e) => setEditText(e.target.value)}
            onKeyPress={handleKeyPress}
            onBlur={handleEdit}
            className="w-full px-2 py-1 border border-blue-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
            autoFocus
          />
        ) : (
          <span className={`text-lg ${
            todo.completed ? 'line-through text-gray-500' : 'text-gray-800'
          }`}>
            {todo.text}
          </span>
        )}
      </div>

      {/* Action Buttons */}
      <div className="flex gap-2">
        <button
          onClick={handleEdit}
          className="text-blue-600 hover:text-blue-800 font-medium text-sm transition duration-200"
        >
          {isEditing ? 'Save' : 'Edit'}
        </button>
        <button
          onClick={() => onDelete(todo.id)}
          className="text-red-600 hover:text-red-800 font-medium text-sm transition duration-200"
        >
          Delete
        </button>
      </div>
    </div>
  );
}

export default App;