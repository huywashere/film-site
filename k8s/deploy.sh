#!/usr/bin/env bash

# CineVerse One-Click Production Kubernetes Deployment Script
set -e

echo "🚀 Deploying CineVerse Production Cluster to Kubernetes..."

if [[ ! "${IMAGE_TAG:-}" =~ ^[a-f0-9]{7,64}$ ]]; then
  echo "IMAGE_TAG must be an immutable Git commit SHA." >&2
  exit 1
fi

kubectl apply -f k8s/namespace.yaml
kubectl apply -f k8s/configmap.yaml
if [ ! -f k8s/secret.yaml ]; then
  echo "Missing k8s/secret.yaml. Create it from secret.example.yaml using a secure secret store." >&2
  exit 1
fi
kubectl apply -f k8s/secret.yaml
kubectl apply -f k8s/redis-deployment.yaml
sed "s/CHANGE_ME_COMMIT_SHA/$IMAGE_TAG/g" k8s/api-deployment.yaml | kubectl apply -f -
sed "s/CHANGE_ME_COMMIT_SHA/$IMAGE_TAG/g" k8s/web-deployment.yaml | kubectl apply -f -
kubectl apply -f k8s/network-policy.yaml
kubectl apply -f k8s/hpa.yaml
kubectl apply -f k8s/ingress.yaml

echo "⏳ Waiting for pods to enter Running state..."
kubectl rollout status deployment/cineverse-api -n cineverse --timeout=120s
kubectl rollout status deployment/cineverse-web -n cineverse --timeout=120s

echo "✅ CineVerse Kubernetes Cluster Deployment Successful!"
kubectl get all -n cineverse
