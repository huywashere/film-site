#!/usr/bin/env bash

# CineVerse One-Click Production Kubernetes Deployment Script
set -e

echo "🚀 Deploying CineVerse Production Cluster to Kubernetes..."

kubectl apply -f k8s/namespace.yaml
kubectl apply -f k8s/configmap.yaml
kubectl apply -f k8s/secret.yaml
kubectl apply -f k8s/redis-deployment.yaml
kubectl apply -f k8s/api-deployment.yaml
kubectl apply -f k8s/web-deployment.yaml
kubectl apply -f k8s/hpa.yaml
kubectl apply -f k8s/ingress.yaml

echo "⏳ Waiting for pods to enter Running state..."
kubectl rollout status deployment/cineverse-api -n cineverse --timeout=120s
kubectl rollout status deployment/cineverse-web -n cineverse --timeout=120s

echo "✅ CineVerse Kubernetes Cluster Deployment Successful!"
kubectl get all -n cineverse
