import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.REACT_APP_SUPABASE_URL || '';
const supabaseAnonKey = process.env.REACT_APP_SUPABASE_ANON_KEY || '';

const hasKeys = supabaseUrl && supabaseUrl !== 'YOUR_SUPABASE_URL' && supabaseAnonKey && supabaseAnonKey !== 'YOUR_SUPABASE_ANON_KEY';

export let isDemoMode = !hasKeys;
export let supabase;

if (hasKeys) {
  try {
    supabase = createClient(supabaseUrl, supabaseAnonKey);
    console.log("Supabase Client initialized successfully.");
  } catch (error) {
    console.warn("Supabase Client could not be initialized, falling back to Demo Mode.", error);
    isDemoMode = true;
  }
}

if (isDemoMode) {
  console.log("Running in DEMO MODE. Using simulated LocalStorage database and auth.");

  // Helper to get simulated state from localStorage
  const getDemoUsers = () => JSON.parse(localStorage.getItem('demo_users') || '[]');
  const setDemoUsers = (users) => localStorage.setItem('demo_users', JSON.stringify(users));

  const getDemoSession = () => JSON.parse(localStorage.getItem('demo_session') || 'null');
  const setDemoSession = (session) => localStorage.setItem('demo_session', JSON.stringify(session));

  const getDemoTasks = () => JSON.parse(localStorage.getItem('demo_tasks') || '[]');
  const setDemoTasks = (tasks) => localStorage.setItem('demo_tasks', JSON.stringify(tasks));

  // Listeners for auth state changes
  const authListeners = new Set();

  const notifyAuthListeners = (event, session) => {
    authListeners.forEach(cb => {
      try {
        cb(event, session);
      } catch (err) {
        console.error("Auth listener error:", err);
      }
    });
  };

  supabase = {
    auth: {
      async getSession() {
        const session = getDemoSession();
        return { data: { session }, error: null };
      },

      async signUp({ email, password }) {
        const users = getDemoUsers();
        if (users.some(u => u.email === email)) {
          return { data: { user: null }, error: new Error('Bu e-posta adresi zaten kayıtlı.') };
        }
        const newUser = { id: 'demo-user-' + Math.random().toString(36).substr(2, 9), email };
        users.push({ ...newUser, password });
        setDemoUsers(users);

        const session = { user: newUser, access_token: 'demo-token-' + Date.now() };
        setDemoSession(session);
        notifyAuthListeners('SIGNED_IN', session);
        return { data: { user: newUser, session }, error: null };
      },

      async signInWithPassword({ email, password }) {
        const users = getDemoUsers();
        const user = users.find(u => u.email === email && u.password === password);
        if (!user) {
          return { data: { session: null }, error: new Error('E-posta veya şifre hatalı.') };
        }
        const session = { user: { id: user.id, email: user.email }, access_token: 'demo-token-' + Date.now() };
        setDemoSession(session);
        notifyAuthListeners('SIGNED_IN', session);
        return { data: { session }, error: null };
      },

      async signOut() {
        setDemoSession(null);
        notifyAuthListeners('SIGNED_OUT', null);
        return { error: null };
      },

      onAuthStateChange(callback) {
        authListeners.add(callback);
        // Immediately run callback with current session on subscribe
        const session = getDemoSession();
        callback(session ? 'SIGNED_IN' : 'SIGNED_OUT', session);

        // Return unsubscribe function
        return {
          data: {
            subscription: {
              unsubscribe() {
                authListeners.delete(callback);
              }
            }
          }
        };
      }
    },

    // Database Mock (From -> Chainable query)
    from(table) {
      if (table !== 'tasks') {
        throw new Error(`Demo mode only supports 'tasks' table. Requested: ${table}`);
      }

      // We implement chainable methods: select, eq, insert, update, delete
      let currentQuery = {
        filters: [],
        operation: 'select', // select | insert | update | delete
        dataToInsert: null,
        dataToUpdate: null
      };

      const executeQuery = () => {
        let tasks = getDemoTasks();
        const session = getDemoSession();
        const currentUserId = session?.user?.id || 'anonymous';

        // Filter by user_id by default (RLS behavior simulation)
        tasks = tasks.filter(t => t.user_id === currentUserId);

        // Apply filters (e.g. eq('env_id', envId))
        currentQuery.filters.forEach(filter => {
          if (filter.type === 'eq') {
            tasks = tasks.filter(t => t[filter.column] === filter.value);
          }
        });

        if (currentQuery.operation === 'select') {
          return { data: tasks, error: null };
        }

        if (currentQuery.operation === 'insert') {
          const rows = Array.isArray(currentQuery.dataToInsert)
            ? currentQuery.dataToInsert
            : [currentQuery.dataToInsert];

          const allTasks = getDemoTasks();
          const newRows = rows.map(r => ({
            id: r.id || 'demo-task-' + Math.random().toString(36).substr(2, 9),
            user_id: currentUserId,
            text: r.text,
            completed: r.completed || false,
            env_id: r.env_id,
            created_at: new Date().toISOString()
          }));

          allTasks.push(...newRows);
          setDemoTasks(allTasks);
          return { data: newRows, error: null };
        }

        if (currentQuery.operation === 'update') {
          // Identify which items match the filter, and update them
          const allTasks = getDemoTasks();
          const updatedRows = [];

          const updatedTasks = allTasks.map(t => {
            // Apply rules: must belong to user, and must pass filters
            const belongsToUser = t.user_id === currentUserId;
            let matchesFilters = belongsToUser;

            if (belongsToUser) {
              currentQuery.filters.forEach(filter => {
                if (filter.type === 'eq' && t[filter.column] !== filter.value) {
                  matchesFilters = false;
                }
              });
            }

            if (matchesFilters) {
              const updated = { ...t, ...currentQuery.dataToUpdate };
              updatedRows.push(updated);
              return updated;
            }
            return t;
          });

          setDemoTasks(updatedTasks);
          return { data: updatedRows, error: null };
        }

        if (currentQuery.operation === 'delete') {
          const allTasks = getDemoTasks();
          const deletedRows = [];

          const remainingTasks = allTasks.filter(t => {
            const belongsToUser = t.user_id === currentUserId;
            let matchesFilters = belongsToUser;

            if (belongsToUser) {
              currentQuery.filters.forEach(filter => {
                if (filter.type === 'eq' && t[filter.column] !== filter.value) {
                  matchesFilters = false;
                }
              });
            }

            if (matchesFilters) {
              deletedRows.push(t);
              return false; // exclude from remaining
            }
            return true;
          });

          setDemoTasks(remainingTasks);
          return { data: deletedRows, error: null };
        }

        return { data: null, error: new Error('Unsupported operation') };
      };

      const chain = {
        select(fields) {
          currentQuery.operation = 'select';
          return chain;
        },
        eq(column, value) {
          currentQuery.filters.push({ type: 'eq', column, value });
          return chain;
        },
        insert(rows) {
          currentQuery.operation = 'insert';
          currentQuery.dataToInsert = rows;
          return chain;
        },
        update(fields) {
          currentQuery.operation = 'update';
          currentQuery.dataToUpdate = fields;
          return chain;
        },
        delete() {
          currentQuery.operation = 'delete';
          return chain;
        },
        // Support directly awaiting the chain for all operations
        then(onfulfilled, onrejected) {
          const result = executeQuery();
          return Promise.resolve(result).then(onfulfilled, onrejected);
        }
      };

      return chain;
    }
  };
}
