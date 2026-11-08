(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory()
  } else {
    root.JavaUpgradeRules = factory()
  }
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict'

  const SOURCES = {
    boot: 'https://github.com/spring-projects/spring-boot/wiki/Spring-Boot-3.0-Migration-Guide',
    java: 'https://docs.oracle.com/en/java/javase/21/migrate/',
    jakarta: 'https://jakarta.ee/specifications/platform/9/apidocs/',
    security: 'https://docs.spring.io/spring-security/reference/5.8/migration/index.html',
    lombok: 'https://projectlombok.org/changelog',
    byteBuddy: 'https://bytebuddy.net/#/releases',
    gradle: 'https://docs.gradle.org/current/userguide/compatibility.html',
    maven: 'https://maven.apache.org/plugins/maven-compiler-plugin/',
    jep396: 'https://openjdk.org/jeps/396',
    jep403: 'https://openjdk.org/jeps/403'
  }

  function finding(severity, title, why, fix, source) {
    return { severity, title, why, fix, source }
  }

  function versionAtLeast(version, major, minor, patch) {
    const parts = String(version).match(/\d+/g) || []
    const actual = [Number(parts[0] || 0), Number(parts[1] || 0), Number(parts[2] || 0)]
    const wanted = [major, minor || 0, patch || 0]
    for (let i = 0; i < 3; i += 1) {
      if (actual[i] !== wanted[i]) return actual[i] > wanted[i]
    }
    return true
  }

  function versionsFor(text, pattern) {
    return [...text.matchAll(pattern)].map(match => match[1]).filter(Boolean)
  }

  function firstVersion(text, patterns) {
    for (const pattern of patterns) {
      const match = text.match(pattern)
      if (match && match[1]) return match[1]
    }
    return null
  }

  function analyze(input) {
    const text = String(input || '')
    const lower = text.toLowerCase()
    const results = []
    const add = (condition, result) => { if (condition) results.push(result) }

    const bootVersion = firstVersion(text, [
      /<parent>[\s\S]*?<version>\s*([0-9]+(?:\.[0-9]+){1,2})\s*<\/version>/i,
      /spring-boot(?:-starter-[\w-]+)?[^\n\r]*?version["'=:\s]+([0-9]+(?:\.[0-9]+){1,2})/i,
      /id\s*["']org\.springframework\.boot["'][^\n\r]*?version\s*["']([0-9]+(?:\.[0-9]+){1,2})["']/i
    ])
    add(bootVersion && !versionAtLeast(bootVersion, 3), finding('blocker', 'Spring Boot is below 3.x',
      'Spring Boot 3 is the generation that moves the framework to Jakarta EE and supports the Java 21 migration path.',
      'Upgrade the parent or plugin to a supported Spring Boot 3 release, then follow its migration guide and test the service.', SOURCES.boot))

    const sourceVersions = versionsFor(text, /(?:maven.compiler.(?:source|target)|<source>|<target>|sourceCompatibility|targetCompatibility)\s*[=:>\"]?\s*([0-9]+)(?:\D|$)/gi)
    const toolchainVersion = firstVersion(text, [/languageVersion\s*=\s*JavaLanguageVersion\.of\((\d+)\)/i, /JavaLanguageVersion\.of\((\d+)\)/i])
    add(sourceVersions.some(version => Number(version) < 17), finding('blocker', 'Java source or target is below 17',
      'Spring Boot 3 requires Java 17 or newer, so a source or target level below 17 prevents the upgrade.',
      'Set the Maven compiler source and target, or the Gradle compatibility values, to at least 17 and preferably 21 for this move.', SOURCES.boot))
    add(toolchainVersion && Number(toolchainVersion) < 17, finding('blocker', 'Gradle Java toolchain is below 17',
      'A Gradle toolchain below Java 17 cannot run a Spring Boot 3 application built for the supported baseline.',
      'Raise languageVersion to at least JavaLanguageVersion.of(17), then use 21 when the application and CI are ready.', SOURCES.boot))

    add(/javax\.(?:persistence|servlet|validation|annotation(?!\.processing)|transaction|jms|mail|inject|ejb|ws\.rs|xml\.bind)\b/i.test(text), finding('blocker', 'Java EE javax namespace is present',
      'Jakarta EE 9 changed the application namespace from javax to jakarta, so these Java EE imports and references do not match Spring Boot 3 APIs. Packages that stay in the JDK, such as javax.sql or javax.crypto, are not flagged.',
      'Replace application imports and configuration references with their jakarta equivalents, then update the related dependencies.', SOURCES.jakarta))
    add(/javax\.persistence\b/i.test(text), finding('blocker', 'JPA still uses javax.persistence',
      'Spring Boot 3 and Hibernate 6 use jakarta.persistence instead of javax.persistence.',
      'Change entity and persistence imports to jakarta.persistence and update persistence dependencies together.', SOURCES.jakarta))
    add(/javax\.servlet\b/i.test(text), finding('blocker', 'Servlet API still uses javax.servlet',
      'Spring Framework 6 uses jakarta.servlet, so javax.servlet types will fail to compile after the upgrade.',
      'Change servlet imports and any explicit servlet dependency to the jakarta.servlet API.', SOURCES.jakarta))
    add(/javax\.validation\b/i.test(text), finding('blocker', 'Validation API still uses javax.validation',
      'Bean Validation moved to jakarta.validation and Spring Boot 3 binds to the Jakarta namespace.',
      'Change validation imports to jakarta.validation and use the matching Jakarta validation starter.', SOURCES.jakarta))

    add(/org\.hibernate(?:\.|:hibernate-core)[^\n\r]*(?:5\.[0-9]+|version["'=:\s]+5\.)/i.test(text) || /hibernate-core[^\n\r]*5\./i.test(text), finding('blocker', 'Hibernate 5 is explicitly selected',
      'Spring Boot 3 uses Hibernate ORM 6, whose Jakarta APIs and query behavior differ from Hibernate 5.',
      'Remove the Hibernate 5 override and let a compatible Spring Boot 3 dependency management version select Hibernate 6, then review queries and custom types.', SOURCES.boot))

    add(/WebSecurityConfigurerAdapter/.test(text), finding('blocker', 'Removed Spring Security configuration is present',
      'WebSecurityConfigurerAdapter was removed in Spring Security 6, which is the security line used by Spring Boot 3.',
      'Replace it with one or more SecurityFilterChain beans and configure HttpSecurity with the component based style.', SOURCES.security))

    const lombokVersions = versionsFor(text, /(?:org\.projectlombok:lombok|lombok)[^\n\r]*(?:version["'=:\s]+|:)([0-9]+\.[0-9]+\.[0-9]+)/gi)
    add(lombokVersions.some(version => !versionAtLeast(version, 1, 18, 30)), finding('warning', 'Lombok is older than Java 21 support',
      'Older Lombok releases can fail against the Java 21 compiler because they depend on compiler internals that changed.',
      'Use Lombok 1.18.30 or newer and keep the annotation processor version aligned with the compile dependency.', SOURCES.lombok))

    const mockitoVersions = versionsFor(text, /(?:org\.mockito:mockito-[\w-]+|mockito(?:Core|Inline)?)[^\n\r]*(?:version["'=:\s]+|:)([0-9]+\.[0-9]+(?:\.[0-9]+)?)/gi)
    add(mockitoVersions.some(version => !versionAtLeast(version, 5)), finding('warning', 'Mockito is older than the current Java 21 baseline',
      'Mockito 5 uses a current Byte Buddy line and is the safer baseline for tests running on Java 21.',
      'Upgrade Mockito to 5.x, then run the test suite and review mock maker or inline mocking configuration.', SOURCES.byteBuddy))

    const gradleVersion = firstVersion(text, [/gradle-([0-9]+\.[0-9]+(?:\.[0-9]+)?)-(?:bin|all)\.zip/i])
    add(gradleVersion && !versionAtLeast(gradleVersion, 8, 5), finding('warning', 'Gradle wrapper is below 8.5',
      'Gradle 8.5 is the first Gradle release with full support for running Gradle on Java 21.',
      'Upgrade the wrapper to 8.5 or newer, then verify plugins and build scripts against the new Gradle version.', SOURCES.gradle))

    const compilerPluginVersion = firstVersion(text, [/maven-compiler-plugin[\s\S]{0,300}?<version>\s*([0-9]+(?:\.[0-9]+){1,2})/i])
    add(compilerPluginVersion && !versionAtLeast(compilerPluginVersion, 3, 11), finding('warning', 'Maven Compiler Plugin is below 3.11',
      'An older compiler plugin can lack the release and toolchain behavior needed for a clean Java 21 build.',
      'Upgrade maven-compiler-plugin to 3.11.0 or newer and configure the Java release explicitly.', SOURCES.maven))

    const jacksonVersion = firstVersion(text, [/com\.fasterxml\.jackson[^\n\r]*(?:version["'=:\s]+|:)(2\.[0-9]+(?:\.[0-9]+)?)/i])
    add(jacksonVersion && !versionAtLeast(jacksonVersion, 2, 14), finding('warning', 'Jackson is older than the Spring Boot 3 line',
      'Spring Boot 3 manages a newer Jackson line, and an explicit older override can cause API or security compatibility problems.',
      'Remove the old override or upgrade it to the version managed by your chosen Spring Boot 3 release.', SOURCES.boot))

    add(/(?:jaxb-api|javax\.xml\.bind)/i.test(text), finding('warning', 'JAXB is referenced explicitly',
      'JAXB was removed from the JDK after Java 8, so Java 21 does not provide these classes automatically.',
      'Use the Jakarta XML Binding API and runtime explicitly, or remove the dependency if the application no longer needs JAXB.', SOURCES.java))
    add(/sun\.misc\.|jdk\.internal\./i.test(text), finding('blocker', 'JDK internal API usage is present',
      'Java 21 strongly encapsulates most internal JDK APIs, so code that worked on Java 8 can fail with access errors.',
      'Replace the internal API with a supported public Java API or isolate the dependency and remove any temporary opens flags.', SOURCES.jep403))

    const kotlinVersion = firstVersion(text, [/(?:kotlin_version|kotlin\("jvm"\)|org\.jetbrains\.kotlin)[^\n\r]*(?:version["'=:\s]+|[:=]\s*)(1\.[0-9]+(?:\.[0-9]+)?)/i])
    add(kotlinVersion && !versionAtLeast(kotlinVersion, 1, 9), finding('warning', 'Kotlin is below the JVM 21 baseline',
      'Kotlin 1.9 is the practical baseline for compiling Kotlin projects to the Java 21 target with current tooling.',
      'Upgrade Kotlin to 1.9 or newer and set the JVM target explicitly, then verify all Kotlin compiler plugins.', SOURCES.java))

    add(results.length === 0, finding('info', 'No known migration pattern was found',
      'The pasted build files do not show one of the checked migration risks, but text analysis cannot prove that the service will build.',
      'Run the project test suite on Java 21 and review the complete Spring Boot 3 migration guide before shipping.', SOURCES.boot))
    return results
  }

  return { analyze }
})
