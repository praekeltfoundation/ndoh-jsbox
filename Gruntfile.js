module.exports = function (grunt) {
    grunt.loadNpmTasks('grunt-contrib-jshint');
    grunt.loadNpmTasks('grunt-mocha-test');
    grunt.loadNpmTasks('grunt-contrib-concat');
    grunt.loadNpmTasks('grunt-contrib-watch');

    grunt.initConfig({
        paths: {
            src: {
                app: {
                    ussd_tb_check: 'src/ussd_tb_check.js',
                },
                ussd_tb_check: [
                    'src/index.js',
                    'src/engage.js',
                    'src/rapidpro.js',
                    '<%= paths.src.app.ussd_tb_check %>',
                    'src/init.js'
                ],
                all: [
                    'src/**/*.js'
                ]
            },
            dest: {
                ussd_tb_check: 'go-app-ussd_tb_check.js',
            },
            test: {
                ussd_tb_check: [
                    'test/setup.js',
                    'src/engage.js',
                    'src/rapidpro.js',
                    '<%= paths.src.app.ussd_tb_check %>',
                    'test/ussd_tb_check.test.js'
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
            ussd_tb_check: {
                src: ['<%= paths.src.ussd_tb_check %>'],
                dest: '<%= paths.dest.ussd_tb_check %>'
            },
        },

        mochaTest: {
            options: {
                reporter: 'spec',
            },
            /*
            */
            test_ussd_tb_check: {
                src: ['<%= paths.test.ussd_tb_check %>']
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