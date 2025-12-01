FROM node:20-bookworm-slim

ENV NODE_ENV=production
WORKDIR /app

COPY entrypoint.sh /usr/local/bin/entrypoint.sh
RUN chmod +x /usr/local/bin/entrypoint.sh

EXPOSE 4173

ENTRYPOINT ["/usr/local/bin/entrypoint.sh"]

