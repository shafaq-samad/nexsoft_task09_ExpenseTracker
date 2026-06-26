import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import fs from 'fs';
import { MongoClient, ObjectId, type Collection } from 'mongodb';

const PORT = Number(process.env.PORT) || 3000;
const app = express();

// Middleware
app.use(express.json());

// ==========================================
// Transaction Interface
// ==========================================
interface ITransaction {
  description: string;
  amount: number;
  category: string;
  type: 'income' | 'expense';
  date: string;
  _id?: string;
}

// ==========================================
// Local JSON Storage Engine
// ==========================================
const DATA_DIR = path.resolve('data');
const DATA_FILE = path.join(DATA_DIR, 'transactions.json');

if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}
if (!fs.existsSync(DATA_FILE)) {
  fs.writeFileSync(DATA_FILE, JSON.stringify([], null, 2));
}

function readLocalTransactions(): ITransaction[] {
  try {
    const data = fs.readFileSync(DATA_FILE, 'utf8');
    return JSON.parse(data);
  } catch (err) {
    console.error('Error reading transactions.json, resetting database fallback file:', err);
    return [];
  }
}

function writeLocalTransactions(transactions: ITransaction[]) {
  try {
    fs.writeFileSync(DATA_FILE, JSON.stringify(transactions, null, 2));
  } catch (err) {
    console.error('Error writing transactions.json:', err);
  }
}

// ==========================================
// MongoDB Storage Engine
// ==========================================
const ATLAS_URI = process.env.MONGODB_ATLAS_URI || process.env.ATLAS_URI || '';
const LOCAL_URI = process.env.MONGODB_URI || process.env.LOCAL_MONGODB_URI || 'mongodb://127.0.0.1:27017/expense-tracker';
const DB_NAME = process.env.MONGODB_DB_NAME || 'expense-tracker';
const COLLECTION_NAME = process.env.MONGODB_COLLECTION || 'transactions';

let mongoClient: MongoClient | null = null;
let mongoCollection: Collection<ITransaction> | null = null;
let mongoSource: string | null = null;

async function connectMongo() {
  if (mongoClient && mongoCollection) {
    return { collection: mongoCollection, source: mongoSource };
  }

  const candidates = [
    { uri: ATLAS_URI, label: 'Atlas Cloud' },
    { uri: LOCAL_URI, label: 'Local MongoDB' },
  ].filter((entry) => entry.uri);

  for (const candidate of candidates) {
    try {
      const client = new MongoClient(candidate.uri);
      await client.connect();
      const collection = client.db(DB_NAME).collection<ITransaction>(COLLECTION_NAME);
      await collection.createIndex({ date: -1 });
      mongoClient = client;
      mongoCollection = collection;
      mongoSource = candidate.label;
      console.log(`MongoDB connected via ${candidate.label} to ${DB_NAME}.${COLLECTION_NAME}`);
      return { collection, source: candidate.label };
    } catch (error) {
      console.warn(`MongoDB connection failed for ${candidate.label}:`, error);
    }
  }

  console.warn('MongoDB unavailable, falling back to local JSON storage.');
  mongoClient = null;
  mongoCollection = null;
  mongoSource = null;
  return null;
}

function normalizeTransaction(doc: any): ITransaction {
  return {
    ...doc,
    _id: doc._id instanceof ObjectId ? doc._id.toString() : doc._id?.toString?.() || doc._id,
  };
}

// ==========================================
// API Endpoints
// ==========================================
app.get('/api/transactions', async (req, res) => {
  try {
    const mongo = await connectMongo();

    if (mongo?.collection) {
      const docs = await mongo.collection.find({}).sort({ date: -1 }).toArray();
      return res.json(docs.map(normalizeTransaction));
    }

    const localTransactions = readLocalTransactions();
    const sorted = [...localTransactions].sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
    );
    return res.json(sorted);
  } catch (error: any) {
    console.error('Error fetching transactions:', error);
    return res.status(500).json({ error: 'Failed to retrieve transactions' });
  }
});

app.post('/api/transactions', async (req, res) => {
  try {
    const { description, amount, category, type, date } = req.body;

    if (!description || typeof amount !== 'number' || !category || !type) {
      return res.status(400).json({ error: 'Missing or invalid transaction fields' });
    }

    if (type !== 'income' && type !== 'expense') {
      return res.status(400).json({ error: 'Type must be "income" or "expense"' });
    }

    const payload = {
      description,
      amount: Math.abs(amount),
      category,
      type,
      date: date ? new Date(date).toISOString() : new Date().toISOString(),
    };

    const mongo = await connectMongo();
    if (mongo?.collection) {
      const result = await mongo.collection.insertOne(payload as ITransaction);
      return res.status(201).json({
        ...payload,
        _id: result.insertedId.toString(),
      });
    }

    const localTransactions = readLocalTransactions();
    const newTx: ITransaction = {
      ...payload,
      _id: 'local_' + Math.random().toString(36).substr(2, 9),
    };
    localTransactions.push(newTx);
    writeLocalTransactions(localTransactions);
    return res.status(201).json(newTx);
  } catch (error: any) {
    console.error('Error adding transaction:', error);
    return res.status(500).json({ error: 'Failed to record transaction' });
  }
});

app.delete('/api/transactions/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const mongo = await connectMongo();
    if (mongo?.collection) {
      const deleteQuery = ObjectId.isValid(id) ? { _id: new ObjectId(id) } : { _id: id };
      const result = await mongo.collection.deleteOne(deleteQuery);

      if (result.deletedCount === 0) {
        return res.status(404).json({ error: 'Transaction not found' });
      }

      return res.json({ success: true, message: 'Transaction deleted successfully from MongoDB' });
    }

    let localTransactions = readLocalTransactions();
    const initialLength = localTransactions.length;
    localTransactions = localTransactions.filter((t) => t._id !== id);

    if (localTransactions.length === initialLength) {
      return res.status(404).json({ error: 'Transaction not found' });
    }

    writeLocalTransactions(localTransactions);
    return res.json({ success: true, message: 'Transaction deleted successfully from local storage' });
  } catch (error: any) {
    console.error('Error deleting transaction:', error);
    return res.status(500).json({ error: 'Failed to delete transaction' });
  }
});

app.get('/api/status', async (req, res) => {
  const mongo = await connectMongo();
  res.json({
    storage: mongo?.source ? `MongoDB (${mongo.source})` : 'Local File Storage',
    mongoConnected: Boolean(mongo?.collection),
    mongoSource: mongo?.source || null,
  });
});

// ==========================================
// Vite Integration (Development or Production)
// ==========================================
async function startServer() {
  if (process.env.DISABLE_HMR === 'true') {
    console.log('DISABLE_HMR is active. Hot module replacement is disabled.');
  }

  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        hmr: process.env.DISABLE_HMR !== 'true',
        watch: process.env.DISABLE_HMR === 'true' ? null : {},
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
    console.log('Vite middleware loaded in Development Mode.');
  } else {
    app.use(express.static(path.resolve('dist')));
    app.get('*', (req, res) => {
      res.sendFile(path.resolve('dist/index.html'));
    });
    console.log('Serving built client from /dist folder.');
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Expense Tracker running on port ${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start full-stack server:', err);
});
