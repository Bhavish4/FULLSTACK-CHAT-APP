# ✨ Full Stack Realtime Chat App ✨

Highlights:

- 🌟 **Tech stack**: MERN (MongoDB, Express.js, React, Node.js) + Socket.io + TailwindCSS + Daisy UI
- 🔒 **Authentication & Authorization**: Secure JWT-based authentication
- ⚡ **Real-time messaging**: Powered by Socket.io
- 🟢 **Online user status**: See who's online in real-time
- 🌐 **Global state management**: Zustand for seamless state handling
- 🛠️ **Error handling**: Robust error handling on both server and client sides
- 🚀 **Deployment**: Step-by-step guide for free deployment
- 🎨 **Responsive design**: TailwindCSS and Daisy UI for a beautiful UI
- ⏳ **And much more!**

---

## 🚀 Getting Started

### Prerequisites

Ensure you have the following installed:

- **Node.js** (v16 or higher)
- **npm** (v8 or higher)
- **MongoDB** (local or cloud instance)

### Setup .env File

Create a `.env` file in the `backend` directory with the following variables:

```env
MONGODB_URI=your_mongodb_connection_string
PORT=5001
JWT_SECRET=your_jwt_secret

CLOUDINARY_CLOUD_NAME=your_cloudinary_cloud_name
CLOUDINARY_API_KEY=your_cloudinary_api_key
CLOUDINARY_API_SECRET=your_cloudinary_api_secret

NODE_ENV=development
```

### Installation

1. **Clone the repository**:

   ```bash
   git clone https://github.com/your-username/fullstack-chat-app.git
   cd fullstack-chat-app
   ```

2. **Install dependencies**:

   ```bash
   # Install backend dependencies
   cd backend
   npm install

   # Install frontend dependencies
   cd ../frontend
   npm install
   ```

### Development

Run the app in development mode:

```bash
# Start the backend server
cd backend
npm run dev

# Start the frontend server
cd ../frontend
npm run dev
```

The backend will run on `http://localhost:5001` and the frontend on `http://localhost:5173`.

---

## 🛠️ Build and Deployment

### Build the App

To build the app for production:

```bash
# Build the frontend
cd frontend
npm run build

# Build the backend (if applicable)
cd ../backend
npm run build
```

### Start the App

To start the app in production mode:

```bash
# Start the backend server
cd backend
npm start
```

Ensure the `frontend/dist` folder is served by your backend or a static file server.

### Deployment

1. **Frontend**: Deploy the `frontend/dist` folder to a static hosting service like Vercel, Netlify, or AWS S3.
2. **Backend**: Deploy the backend to a cloud platform like Heroku, Render, or AWS.

---

## 📂 Project Structure

### Backend

- **`src/controllers`**: Handles request logic (e.g., `auth.controller.js`, `message.controller.js`)
- **`src/models`**: Database models (e.g., `user.model.js`, `message.model.js`)
- **`src/routes`**: API routes (e.g., `auth.route.js`, `message.route.js`)
- **`src/middleware`**: Middleware functions (e.g., `auth.middleware.js`)
- **`src/lib`**: Utility libraries (e.g., `cloudinary.js`, `db.js`)

### Frontend

- **`src/components`**: Reusable UI components (e.g., `ChatContainer.jsx`, `Navbar.jsx`)
- **`src/pages`**: Page components (e.g., `HomePage.jsx`, `LoginPage.jsx`)
- **`src/store`**: Zustand stores (e.g., `useAuthStore.js`, `useChatStore.js`)
- **`src/lib`**: Utility libraries (e.g., `axios.js`, `utils.js`)

---

## 🤝 Contributing

1. Fork the repository
2. Create a new branch (`git checkout -b feature/your-feature`)
3. Commit your changes (`git commit -m 'Add some feature'`)
4. Push to the branch (`git push origin feature/your-feature`)
5. Open a Pull Request

---

## 📜 License

This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for details.

---

## 🌟 Acknowledgments

- [MongoDB](https://www.mongodb.com/)
- [Express.js](https://expressjs.com/)
- [React](https://reactjs.org/)
- [Node.js](https://nodejs.org/)
- [Socket.io](https://socket.io/)
- [TailwindCSS](https://tailwindcss.com/)
- [Daisy UI](https://daisyui.com/)
