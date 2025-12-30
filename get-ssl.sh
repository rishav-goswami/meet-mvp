# 1. Remove old certs to avoid confusion
sudo rm -rf nginx/certs

# 2. Create the directory again
mkdir -p nginx/certs

# 3. Generate the self-signed certificate (VALID for 365 days)
sudo openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
  -keyout nginx/certs/selfsigned.key \
  -out nginx/certs/selfsigned.crt \
  -subj "/C=US/ST=Demo/L=Demo/O=MyOrg/CN=3.110.66.235"