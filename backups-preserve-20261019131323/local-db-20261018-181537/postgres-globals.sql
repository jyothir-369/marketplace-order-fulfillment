--
-- PostgreSQL database cluster dump
--

\restrict QA7J59r4vNPPUMeSqv5dyvoYDWYqjj0jAphGIXlvcSm7VJCajMkRbyohfjhk9cl

SET default_transaction_read_only = off;

SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;

--
-- Roles
--

CREATE ROLE postgres;
ALTER ROLE postgres WITH SUPERUSER INHERIT CREATEROLE CREATEDB LOGIN REPLICATION BYPASSRLS PASSWORD 'SCRAM-SHA-256$4096:p3v4IvlviWlvlmqrrLNPQQ==$QUGHg2yBuYo1mXbS2WFjPOEkccmSRGM0JNz1CVBoIlE=:O3Q11Gh3lsWAduF/AVBVqfC2b/Kjt4JsQlh0XcngqcI=';

--
-- User Configurations
--








\unrestrict QA7J59r4vNPPUMeSqv5dyvoYDWYqjj0jAphGIXlvcSm7VJCajMkRbyohfjhk9cl

--
-- PostgreSQL database cluster dump complete
--

