module.exports = function (grunt) {
    grunt.loadNpmTasks('grunt-contrib-jshint');
    grunt.loadNpmTasks('grunt-mocha-test');
    grunt.loadNpmTasks('grunt-contrib-concat');
    grunt.loadNpmTasks('grunt-contrib-watch');

    grunt.initConfig({
        paths: {
            src: {
                app: {
                    ussd_optout_rapidpro_v2: 'src/ussd_optout_rapidpro_v2.js',
                },
                ussd_optout_rapidpro_v2: [
                    'src/index.js',
                    'src/engage.js',
                    'src/rapidpro.js',
                    '<%= paths.src.app.ussd_optout_rapidpro_v2 %>',
                    'src/init.js'
                ],
                all: [
                    'src/**/*.js'
                ]
            },
            dest: {
                ussd_optout_rapidpro_v2: 'go-app-ussd_optout_rapidpro_v2.js',
            },
            test: {
                ussd_optout_rapidpro_v2: [
                    'test/setup.js',
                    'src/engage.js',
                    'src/rapidpro.js',
                    '<%= paths.src.app.ussd_optout_rapidpro_v2 %>',
                    'test/ussd_optout_rapidpro_v2.test.js'
                ],
            }
        },

        jshint: {
            options: {jshintrc: '.jshintrc'},
            all: [
                'Gruntfile.js',
                '<%= paths.src.all %>',
                'test/*.js',
            ]
        },

        watch: {
            src: {
                files: ['<%= paths.src.all %>'],
                tasks: ['build']
            }
        },

        concat: {
            ussd_optout_rapidpro_v2: {
                src: ['<%= paths.src.ussd_optout_rapidpro_v2 %>'],
                dest: '<%= paths.dest.ussd_optout_rapidpro_v2 %>'
            },
        },

        mochaTest: {
            options: {
                reporter: 'spec',
            },
            /*
            */
            test_ussd_optout_rapidpro_v2: {
                src: ['<%= paths.test.ussd_optout_rapidpro_v2 %>']
            },
            /*
            */
        }
    });

    grunt.registerTask('test', [
        'jshint',
        'build',
        'mochaTest'
    ]);

    grunt.registerTask('build', [
        'concat'
    ]);

    grunt.registerTask('default', [
        'build',
        'test'
    ]);
};
