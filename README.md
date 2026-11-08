# Java Upgrade Checker

Java Upgrade Checker is a small browser tool for checking a Spring Boot service before moving from Java 8 to Java 21 and from Spring Boot 2.x to 3.x.

It reads pasted text locally. It does not upload project files, use a build step, load dependencies, or make network requests at runtime.

## How to use

1. Open `index.html` in a browser.
2. Paste a `pom.xml`, `build.gradle`, or `build.gradle.kts` file into the text area.
3. Add a few Java imports if you want namespace checks.
4. Select Analyze project.
5. Use Copy as Markdown when you want to share the findings.

Select Load example to try the tool with a realistic older Maven project.

## How to run tests

From this folder, run:

```text
node --test
```

The tests use Node 22 built in test support. There are no installed packages.

## Checks

The checker looks for these concrete signals:

* Spring Boot below 3.x
* Java source or target below 17
* Gradle Java toolchain below 17
* Java EE `javax` namespaces (persistence, servlet, validation, annotation, transaction, jms, mail, inject, ejb, ws.rs, xml.bind), but not packages that stay in the JDK such as `javax.sql`
* `javax.persistence`
* `javax.servlet`
* `javax.validation`
* Hibernate 5
* `WebSecurityConfigurerAdapter`
* Lombok older than 1.18.30
* Mockito older than 5
* Gradle wrapper below 8.5
* Maven Compiler Plugin below 3.11
* Jackson older than 2.14 when explicitly pinned
* JAXB API references
* JDK internal APIs such as `sun.misc.Unsafe`
* Kotlin below 1.9

## Honest limits

This is heuristic text matching, not a build. It can miss versions expressed through properties, imported Gradle catalogs, transitive dependencies, application code, or runtime behavior. It can also report a warning when an explicit override deserves review. Always run the full test suite on Java 21, inspect dependency resolution, and read the official migration documentation for the selected Spring Boot release.

## License

MIT. Copyright Ilija Mihajlovic.
