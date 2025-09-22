> kubectl get namespace besuscan-dev
NAME           STATUS   AGE
besuscan-dev   Active   6m18s

> kubectl get pv
NAME                     CAPACITY   ACCESS MODES   RECLAIM POLICY   STATUS      CLAIM                              STORAGECLASS    VOLUMEATTRIBUTESCLASS   REASON   AGE
api-source-pv-dev        1Gi        RWX            Retain           Bound       besuscan-dev/api-source-pvc        source-code     <unset>                          6m28s
frontend-source-pv-dev   2Gi        RWX            Retain           Bound       besuscan-dev/frontend-source-pvc   source-code     <unset>                          6m28s
go-modules-pv-dev        5Gi        RWX            Retain           Bound       besuscan-dev/go-modules-pvc        build-cache     <unset>                          5m4s
indexer-source-pv-dev    1Gi        RWX            Retain           Bound       besuscan-dev/indexer-source-pvc    source-code     <unset>                          6m28s
postgres-pv-dev          10Gi       RWO            Retain           Bound       besuscan-dev/postgres-pvc          local-storage   <unset>                          6m28s
rabbitmq-pv-dev          5Gi        RWO            Retain           Available                                      local-storage   <unset>                          6m28s
redis-pv-dev             2Gi        RWO            Retain           Available                                      local-storage   <unset>                          6m28s
worker-source-pv-dev     1Gi        RWX            Retain           Bound       besuscan-dev/worker-source-pvc     source-code     <unset>         


> kubectl get pvc -n besuscan-dev
NAME                  STATUS    VOLUME                   CAPACITY   ACCESS MODES   STORAGECLASS    VOLUMEATTRIBUTESCLASS   AGE
api-source-pvc        Bound     api-source-pv-dev        1Gi        RWX            source-code     <unset>                 6m53s
frontend-source-pvc   Bound     frontend-source-pv-dev   2Gi        RWX            source-code     <unset>                 6m53s
go-modules-pvc        Bound     go-modules-pv-dev        5Gi        RWX            build-cache     <unset>                 5m29s
indexer-source-pvc    Bound     indexer-source-pv-dev    1Gi        RWX            source-code     <unset>                 6m53s
postgres-pvc          Bound     postgres-pv-dev          10Gi       RWO            local-storage   <unset>                 6m53s
rabbitmq-pvc          Pending                                                      local-storage   <unset>                 6m53s
redis-pvc             Pending                                                      local-storage   <unset>                 6m53s
worker-source-pvc     Bound     worker-source-pv-dev     1Gi        RWX            source-code     <unset>                 6m53s


> kubectl get pods -n besuscan-dev
NAME                                   READY   STATUS             RESTARTS      AGE
postgres-deployment-7d8ddf67c4-hbzxh   0/1     CrashLoopBackOff   5 (52s ago)   4m8s

> kubectl logs -f deployment/postgres-deployment -n besuscan-dev
chmod: /var/lib/postgresql/data: Operation not permitted
chmod: /var/run/postgresql: Operation not permitted
The files belonging to this database system will be owned by user "postgres".
This user must also own the server process.

The database cluster will be initialized with this locale configuration:
  provider:    libc
  LC_COLLATE:  C
  LC_CTYPE:    C
  LC_MESSAGES: en_US.utf8
  LC_MONETARY: en_US.utf8
  LC_NUMERIC:  en_US.utf8
  LC_TIME:     en_US.utf8
The default text search configuration will be set to "english".

Data page checksums are disabled.

initdb: error: could not change permissions of directory "/var/lib/postgresql/data": Operation not permitted
fixing permissions on existing directory /var/lib/postgresql/data ... #                                                                                          
 ~/development/explorer  main !2 ?5                                                


 > kubectl get services -n besuscan-dev
NAME               TYPE        CLUSTER-IP      EXTERNAL-IP   PORT(S)    AGE
api-service        ClusterIP   10.96.132.73    <none>        8080/TCP   4m18s
frontend-service   ClusterIP   10.96.111.45    <none>        80/TCP     4m14s
indexer-service    ClusterIP   10.96.137.144   <none>        9090/TCP   4m11s
worker-service     ClusterIP   10.96.235.36    <none>        9091/TCP   4m7s

> kubectl get ingress -n besuscan-dev
NAME               CLASS   HOSTS                  ADDRESS     PORTS     AGE
besuscan-ingress   nginx   besuscan.hubweb3.com   localhost   80, 443   2m31s