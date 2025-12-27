FROM node:18-bullseye

# Install dependencies required to compile Mediasoup (C++)
RUN apt-get update && apt-get install -y \
    python3 \
    python3-pip \
    build-essential \
    iproute2 \
    net-tools \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY package*.json ./

# This will compile Mediasoup (takes 1-2 mins)
RUN npm install

COPY . .

# Build placeholder (We will add TS build later)
# RUN npm run build 

CMD ["npm", "start"]