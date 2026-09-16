# Use the official Node.js Alpine image for a smaller footprint
FROM node:22-alpine

# Set the working directory inside the container
WORKDIR /app

# Copy package.json and package-lock.json first to leverage Docker cache
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy the rest of the application source code
COPY . .

# Generate the Prisma client based on your schema
RUN npx prisma generate

# Expose the port NestJS runs on
EXPOSE 3000

# Start the application in development mode for hot-reloading
CMD ["npm", "run", "start:dev"]